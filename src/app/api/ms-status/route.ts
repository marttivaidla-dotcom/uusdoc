import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-token')?.value
  if (!token) return NextResponse.json({ connected: false })
  const admin = createSupabaseAdmin()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ connected: false })
  const { data } = await admin
    .from('microsoft_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return NextResponse.json({ connected: !!data })
}
