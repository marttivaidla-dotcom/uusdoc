import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

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

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY puudub' }, { status: 500 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fail puudub' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const uint8 = new Uint8Array(bytes)
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < uint8.length; i += CHUNK) {
    binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK))
  }
  const base64 = btoa(binary)
  const mimeType = file.type || 'application/octet-stream'

  let result: any
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inline_data: { data: base64, mime_type: mimeType } },
              { text: PROMPT },
            ],
          }],
        }),
      }
    )
    result = await res.json()
  } catch (err: any) {
    return NextResponse.json({ error: 'Gemini API viga: ' + String(err) }, { status: 500 })
  }

  if (result.error) {
    return NextResponse.json({ error: 'Gemini viga: ' + result.error.message, code: result.error.code }, { status: 500 })
  }

  const text: string = result.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return NextResponse.json({ error: 'Gemini tagastas tühja vastuse', raw: JSON.stringify(result).slice(0, 500) }, { status: 500 })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Gemini ei tagastanud JSON-i', raw: text.slice(0, 500) }, { status: 500 })

  try {
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, data, fail_nimi: file.name })
  } catch {
    return NextResponse.json({ error: 'JSON parse viga', raw: text.slice(0, 500) }, { status: 500 })
  }
}
