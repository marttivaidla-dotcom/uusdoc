import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { GoogleGenAI } from '@google/genai'

const PROMPT = `Loe sellelt arvelt andmed ja tagasta AINULT JSON, mitte muud teksti:
{
  "hankija": "müüja/hankija ettevõtte nimi",
  "arve_nr": "arve number",
  "arve_kuupaev": "YYYY-MM-DD või null",
  "tahtaeg": "maksetähtaeg YYYY-MM-DD või null",
  "summa": number (lõppsumma koos käibemaksuga) või null,
  "km": number (käibemaksu summa) või null
}
Kui mõni väli pole arvel näha, kasuta null.`

function shareIdFromUrl(url: string) {
  const b64 = Buffer.from(url).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return 'u!' + b64
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get('sb-token')?.value
  if (!token) return null
  const admin = createSupabaseAdmin()
  const { data: { user } } = await admin.auth.getUser(token)
  return user
}

async function getMsToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('microsoft_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()
  if (!data) return null

  // Uuenda token kui aegunud
  if (new Date(data.expires_at) < new Date(Date.now() + 60_000)) {
    const clientId = process.env.MICROSOFT_CLIENT_ID!
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: data.refresh_token, grant_type: 'refresh_token',
        scope: 'Files.Read offline_access',
      }),
    })
    const tokens = await res.json()
    if (tokens.access_token) {
      const expires = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await admin.from('microsoft_tokens').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || data.refresh_token,
        expires_at: expires,
      }).eq('user_id', userId)
      return tokens.access_token
    }
    return null
  }
  return data.access_token
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id } = await req.json()
  if (!company_id) return NextResponse.json({ error: 'company_id puudub' }, { status: 400 })

  const admin = createSupabaseAdmin()
  const { data: company } = await admin
    .from('companies').select('onedrive_url, nimi').eq('id', company_id).single()

  if (!company?.onedrive_url)
    return NextResponse.json({ error: 'Ettevõttel pole OneDrive linki' }, { status: 400 })

  const msToken = await getMsToken(user.id)
  if (!msToken)
    return NextResponse.json({
      error: 'Microsoft konto pole ühendatud',
      needsAuth: true,
    }, { status: 401 })

  // Loendu failid Graph API shares kaudu
  const shareId = shareIdFromUrl(company.onedrive_url)
  const listRes = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/root/children?$select=name,file,size,@microsoft.graph.downloadUrl`,
    { headers: { Authorization: `Bearer ${msToken}`, Accept: 'application/json' } }
  )

  if (!listRes.ok) {
    const errText = await listRes.text()
    return NextResponse.json({
      error: `OneDrive ligipääs ebaõnnestus (HTTP ${listRes.status})`,
      detail: errText.slice(0, 300),
    }, { status: 400 })
  }

  const listData = await listRes.json()
  const allFiles: any[] = (listData.value || []).filter((f: any) =>
    f.file && /\.(pdf|jpg|jpeg|png)$/i.test(f.name)
  )

  if (allFiles.length === 0)
    return NextResponse.json({ error: 'Kaustas pole PDF/JPG/PNG faile' }, { status: 400 })

  // Kontrollime millised failid on juba loetud
  const { data: existing } = await admin
    .from('invoices')
    .select('fail_nimi')
    .eq('user_id', user.id)
    .eq('company_id', company_id)

  const existingNames = new Set((existing || []).map((r: any) => r.fail_nimi))
  const newFiles = allFiles.filter(f => !existingNames.has(f.name))
  const skipped = allFiles.length - newFiles.length

  if (newFiles.length === 0)
    return NextResponse.json({
      results: [], total: allFiles.length, skipped,
      message: `Kõik ${allFiles.length} faili on juba imporditud`,
    })

  const apiKey = process.env.GEMINI_API_KEY!
  const ai = new GoogleGenAI({ apiKey })
  const results: any[] = []

  for (const file of newFiles) {
    try {
      const dlUrl = file['@microsoft.graph.downloadUrl']
      if (!dlUrl) continue

      const fileRes = await fetch(dlUrl)
      if (!fileRes.ok) continue

      const bytes = await fileRes.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const ext = file.name.split('.').pop()?.toLowerCase()
      const mimeType = ext === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png' : 'image/jpeg'

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [
          { inlineData: { data: base64, mimeType } },
          { text: PROMPT },
        ]}],
      })

      const text = result.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      const data = JSON.parse(jsonMatch[0])
      results.push({ ...data, fail_nimi: file.name, company_id })
    } catch {
      // jätka järgmise failiga
    }
  }

  return NextResponse.json({ results, total: allFiles.length, skipped, new: newFiles.length })
}
