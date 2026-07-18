import { apiJson } from '@876/core/api'
import {
  buildSafeBridgePath,
  copyBridgeResponse,
  fetchApiBridge,
} from '@876/core/fetch/bridge'
import type { NextRequest } from 'next/server'

import { getRequestOrigin } from '@/lib/auth/request-origin'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ path: string[] }> }

const API_KEY = process.env.BILLING_API_876_KEY

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context)
}

async function proxyAuthRequest(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { path } = await context.params
  const authPath = buildSafeBridgePath('/auth', path)
  if (!authPath) return apiJson({ error: 'Not found.' }, { status: 404 })

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  const cookie = request.headers.get('cookie')
  const requestId = request.headers.get('x-request-id')

  if (contentType) headers.set('content-type', contentType)
  if (cookie) headers.set('cookie', cookie)
  if (requestId) headers.set('x-request-id', requestId)
  headers.set('x-876-origin', getRequestOrigin(request))
  if (API_KEY) headers.set('X-876-API-Key', API_KEY)

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text()
  const apiResponse = await fetchApiBridge(authPath, {
    method: request.method,
    headers,
    body,
    search: request.nextUrl.search,
  })

  return copyBridgeResponse(apiResponse)
}
