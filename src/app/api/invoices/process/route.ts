import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export const maxDuration = 60

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
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'application/octet-stream'

  let text = ''
  try {
    const ai = new GoogleGenAI({ apiKey })
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { thinkingConfig: { thinkingBudget: 0 } },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: PROMPT },
        ],
      }],
    })
    text = result.text ?? ''
  } catch (err: any) {
    return NextResponse.json({
      error: 'Gemini API viga: ' + (err?.message || String(err)),
      detail: err?.status || err?.code || '',
    }, { status: 500 })
  }

  if (!text) return NextResponse.json({ error: 'Gemini tagastas tühja vastuse' }, { status: 500 })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Gemini ei tagastanud JSON-i', raw: text.slice(0, 500) }, { status: 500 })

  try {
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, data, fail_nimi: file.name })
  } catch {
    return NextResponse.json({ error: 'JSON parse viga', raw: text.slice(0, 500) }, { status: 500 })
  }
}
