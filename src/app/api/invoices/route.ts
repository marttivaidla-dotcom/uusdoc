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
  const companyId = req.nextUrl.searchParams.get('company_id')
  const admin = createSupabaseAdmin()
  let q = admin
    .from('invoices')
    .select('*, companies(nimi)')
    .eq('user_id', user.id)
    .order('arve_kuupaev', { ascending: false })
  if (companyId) q = q.eq('company_id', companyId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('invoices')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id puudub' }, { status: 400 })
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('invoices').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
