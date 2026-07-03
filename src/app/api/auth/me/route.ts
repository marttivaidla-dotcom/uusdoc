import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sb-token')?.value
  if (!token) return NextResponse.json({ user: null })
  const admin = createSupabaseAdmin()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}
