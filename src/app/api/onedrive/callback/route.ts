import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') // 'invoices' või company_id
  const error = req.nextUrl.searchParams.get('error')
  const APP = process.env.NEXT_PUBLIC_APP_URL!

  if (error) return NextResponse.redirect(`${APP}/invoices?error=${error}`)
  if (!code) return NextResponse.redirect(`${APP}/invoices?error=missing_code`)

  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const redirectUri = `${APP}/api/onedrive/callback`

  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
      scope: 'Files.Read offline_access User.Read',
    }),
  })

  const tokens = await tokenRes.json()
  if (tokens.error) return NextResponse.redirect(`${APP}/invoices?error=${tokens.error}`)

  const sbToken = req.cookies.get('sb-token')?.value
  if (!sbToken) return NextResponse.redirect(`${APP}/login`)

  const admin = createSupabaseAdmin()
  const { data: { user } } = await admin.auth.getUser(sbToken)
  if (!user) return NextResponse.redirect(`${APP}/login`)

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Salvesta Microsoft token kasutaja tasandil
  await admin.from('microsoft_tokens').upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    expires_at: expiresAt,
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${APP}/invoices?ms_connected=1`)
}
