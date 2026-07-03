import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const supabase = createSupabaseServer()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const res = NextResponse.json({ ok: true, email: data.user?.email })
  res.cookies.set('sb-token', data.session.access_token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
  res.cookies.set('sb-refresh', data.session.refresh_token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
  return res
}
