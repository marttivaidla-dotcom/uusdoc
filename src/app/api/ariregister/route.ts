import { NextRequest, NextResponse } from 'next/server'

function buildSoap(query: string, isCode: boolean) {
  const queryField = isCode
    ? `<prod:ariregistri_kood>${query}</prod:ariregistri_kood>`
    : `<prod:evnimi>${query}</prod:evnimi>`
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:prod="http://arireg.x-road.eu/producer/">
  <soapenv:Body>
    <prod:lihtandmedTasuta_v1>
      <prod:keha>
        <prod:evarv>10</prod:evarv>
        <prod:keel>est</prod:keel>
        ${queryField}
      </prod:keha>
    </prod:lihtandmedTasuta_v1>
  </soapenv:Body>
</soapenv:Envelope>`
}

// Tagastab XML sildi sisu, ignoreerib namespace prefiksit (ns1:, prod: jne)
function xmlVal(block: string, tag: string): string {
  const m = block.match(new RegExp(`<[^:>]*:?${tag}[^>]*>([^<]*)<\/[^:>]*:?${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function parseResponse(xml: string) {
  const companies: any[] = []
  const itemRegex = /<[^:>]+:item>([\s\S]*?)<\/[^:>]+:item>/g
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const nimi = xmlVal(block, 'evnimi')
    const registrikood = xmlVal(block, 'ariregistri_kood')
    if (nimi) companies.push({ nimi, registrikood: registrikood || null })
  }
  return companies
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ companies: [] })

  const isCode = /^\d+$/.test(q)
  const soap = buildSoap(q, isCode)

  const attempts = [
    { url: 'https://ariregxmlv6.rik.ee/', soapAction: '""' },
    { url: 'https://ariregxmlv6.rik.ee/', soapAction: '"http://arireg.x-road.eu/producer/lihtandmed_v2"' },
  ]

  const errors: Record<string, string> = {}

  for (const { url, soapAction } of attempts) {
    const key = `${url}[${soapAction}]`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': soapAction,
          'Accept': 'text/xml, application/xml, */*',
        },
        body: soap,
        cache: 'no-store',
      })
      const text = await res.text()

      // Kui saime SOAP vastuse (mitte Cloudflare HTML), proovi parsida
      if (text.includes('SOAP') || text.includes('soap')) {
        const companies = parseResponse(text)
        return NextResponse.json({ companies })
      }

      errors[key] = `HTTP ${res.status}: ${text.slice(0, 300)}`
    } catch (err: any) {
      errors[key] = err.message
    }
  }

  return NextResponse.json({ companies: [], errors })
}
