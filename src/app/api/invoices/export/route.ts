import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('sb-token')?.value
  if (!token) return null
  const admin = createSupabaseAdmin()
  const { data: { user } } = await admin.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fmt = req.nextUrl.searchParams.get('fmt') || 'csv'
  const companyId = req.nextUrl.searchParams.get('company_id')

  const admin = createSupabaseAdmin()
  let q = admin
    .from('invoices')
    .select('*, companies(nimi, jarjekorra_nr, acc_number, vat_code)')
    .eq('user_id', user.id)
    .order('arve_kuupaev', { ascending: true })
  if (companyId) q = q.eq('company_id', companyId)

  const { data: invoices, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (fmt === 'books') {
    return exportBooks(invoices || [], companyId)
  }

  const sep = ';'
  const headers = ['Järjek nr', 'Kuupäev', 'Arve nr', 'Hankija', 'Ettevõte', 'KM-ta', 'KM', 'Kokku', 'Tähtaeg', 'Staatus']

  const rows = (invoices || []).map(inv => {
    const summa = inv.summa ?? 0
    const km = inv.km ?? 0
    const neto = (summa - km).toFixed(2)
    return [
      inv.companies?.jarjekorra_nr || '',
      inv.arve_kuupaev || '',
      inv.arve_nr || '',
      inv.hankija || '',
      inv.companies?.nimi || '',
      neto,
      km ? km.toFixed(2) : '',
      summa ? summa.toFixed(2) : '',
      inv.tahtaeg || '',
      inv.staatus || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(sep)
  })

  const content = [headers.join(sep), ...rows].join('\r\n')
  const bom = '﻿'

  return new NextResponse(bom + content, {
    headers: {
      'Content-Type': fmt === 'txt' ? 'text/plain; charset=utf-8' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="arved.${fmt}"`,
    },
  })
}

function exportBooks(invoices: any[], companyId: string | null) {
  const company = invoices[0]?.companies
  const compnr = company?.jarjekorra_nr || '1'

  const header = [
    `compnr\t${compnr}`,
    'format',
    '1\t46\t1\t0\t1\t0',
    '',
    'codepage\tUTF-8',
  ].join('\r\n')

  const rows = invoices.map((inv, i) => {
    const summa = inv.summa ?? 0
    const km = inv.km ?? 0
    const neto = (summa - km).toFixed(2)
    const accNumber = inv.companies?.acc_number || ''
    const vatCode = inv.companies?.vat_code || ''
    const comment = [inv.hankija, inv.arve_nr].filter(Boolean).join(' ')
    const fields = [
      String(i + 1),   // SerNr
      accNumber,        // AccNumber
      comment,          // Comment
      '',               // Objects
      '',               // Item
      '1',              // qty
      neto,             // Sum
      vatCode,          // VATCode
      '',               // PRCode
    ]
    return fields.join('\t')
  })

  const content = header + '\r\n\r\n\r\nVIVc\r\n' + rows.join('\r\n\r\n')

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="arved_books.txt"',
    },
  })
}
