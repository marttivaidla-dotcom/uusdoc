import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Microsoft OAuth ei ole seadistatud' }, { status: 500 })

  const APP = process.env.NEXT_PUBLIC_APP_URL!
  const redirectUri = `${APP}/api/onedrive/callback`

  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'Files.Read offline_access User.Read')
  url.searchParams.set('state', 'invoices')
  url.searchParams.set('response_mode', 'query')

  return NextResponse.redirect(url.toString())
}
