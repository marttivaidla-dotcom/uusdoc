import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('sb-token')
  res.cookies.delete('sb-refresh')
  return res
}
