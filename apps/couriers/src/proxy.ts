import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(request: NextRequest): NextResponse {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const headers = new Headers(request.headers)
  headers.set('x-request-id', requestId)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  // /org/** guards itself in RSC layouts (enterprise realm check needs Node runtime).
  // Proxy is a pass-through for request-ID propagation only.
  matcher: [],
}
