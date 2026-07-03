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
    .select('*, companies(nimi)')
    .eq('user_id', user.id)
    .order('arve_kuupaev', { ascending: true })
  if (companyId) q = q.eq('company_id', companyId)

  const { data: invoices, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sep = ';'
  const headers = ['Kuupäev', 'Arve nr', 'Hankija', 'Ettevõte', 'KM-ta', 'KM', 'Kokku', 'Tähtaeg', 'Staatus']

  const rows = (invoices || []).map(inv => {
    const summa = inv.summa ?? 0
    const km = inv.km ?? 0
    const neto = (summa - km).toFixed(2)
    return [
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
  const bom = '﻿' // UTF-8 BOM Excel jaoks

  return new NextResponse(bom + content, {
    headers: {
      'Content-Type': fmt === 'txt' ? 'text/plain; charset=utf-8' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="arved.${fmt}"`,
    },
  })
}
