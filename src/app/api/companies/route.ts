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
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ companies: data })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { nimi, registrikood } = await req.json()
  if (!nimi?.trim()) return NextResponse.json({ error: 'Nimi on kohustuslik' }, { status: 400 })
  const admin = createSupabaseAdmin()
  // Kontrolli duplikaati registrikoodi või nime järgi
  const rk = registrikood?.trim() || null
  const { data: existing } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .or(rk ? `registrikood.eq.${rk},nimi.ilike.${nimi.trim()}` : `nimi.ilike.${nimi.trim()}`)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'See ettevõte on juba lisatud' }, { status: 409 })
  const { data, error } = await admin
    .from('companies')
    .insert({ user_id: user.id, nimi: nimi.trim(), registrikood: rk })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ company: data })
}
