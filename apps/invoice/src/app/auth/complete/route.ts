import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('return_to') ?? '/'
  const safe = returnTo.startsWith('/') ? returnTo : '/'
  return NextResponse.redirect(new URL(safe, request.url))
}
