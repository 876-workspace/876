import { appendSetCookies, fetchApiBridge } from '@876/core/fetch/bridge'
import { NextResponse, type NextRequest } from 'next/server'
export const runtime = 'nodejs'
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code')
  const login = new URL('/login', request.url)
  if (!code) return NextResponse.redirect(login)
  try {
    const api = await fetchApiBridge('/auth/callback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-876-Realm': 'enterprise',
        ...(process.env.COMMERCE_API_876_KEY
          ? { 'X-876-API-Key': process.env.COMMERCE_API_876_KEY }
          : {}),
      },
      body: JSON.stringify({ code }),
    })
    if (!api.ok) return NextResponse.redirect(login)
    const response = NextResponse.redirect(new URL('/', request.url))
    appendSetCookies(api, response)
    return response
  } catch {
    return NextResponse.redirect(login)
  }
}
