import { apiJson } from '@876/core/api'
import {
  buildSafeBridgePath,
  copyBridgeResponse,
  fetchApiBridge,
} from '@876/core/fetch/bridge'
import type { NextRequest } from 'next/server'
export const runtime = 'nodejs'
type RouteContext = { params: Promise<{ path: string[] }> }
async function proxy(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const authPath = buildSafeBridgePath('/auth', (await context.params).path)
  if (!authPath) return apiJson({ error: 'Not found.' }, { status: 404 })
  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  const cookie = request.headers.get('cookie')
  if (contentType) headers.set('content-type', contentType)
  if (cookie) headers.set('cookie', cookie)
  headers.set('x-876-origin', request.nextUrl.origin)
  headers.set('X-876-Realm', 'enterprise')
  if (process.env.COMMERCE_API_876_KEY)
    headers.set('X-876-API-Key', process.env.COMMERCE_API_876_KEY)
  return copyBridgeResponse(
    await fetchApiBridge(authPath, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.text(),
      search: request.nextUrl.search,
    })
  )
}
export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}
export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}
