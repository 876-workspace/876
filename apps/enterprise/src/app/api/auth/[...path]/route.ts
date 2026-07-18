import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import {
  buildSafeBridgePath,
  copyBridgeResponse,
  fetchApiBridge,
} from '@876/core/fetch/bridge'
import { getRequestOrigin } from '@/lib/auth/request-origin'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ path: string[] }>
}

const API_KEY = process.env.API_876_KEY

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context)
}

/**
 * Thin pure-transport bridge: forwards `/api/auth/*` to the FastAPI core's
 * `/auth/*` endpoints with the app API key attached, and copies the API's
 * `Set-Cookie` (session) back onto the response. This is what lets the org
 * workspace host embedded auth and own its session cookie directly, instead of
 * redirecting to the centralized auth app.
 */
async function proxyAuthRequest(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { path } = await context.params
  const authPath = buildSafeBridgePath('/auth', path)
  if (!authPath) {
    return apiJson({ error: 'Not found.' }, { status: 404 })
  }

  const headers = buildForwardHeaders(request)
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

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  const cookie = request.headers.get('cookie')
  const origin = getRequestOrigin(request)
  const requestId = request.headers.get('x-request-id')

  if (contentType) headers.set('content-type', contentType)
  if (cookie) headers.set('cookie', cookie)
  if (origin) headers.set('x-876-origin', origin)
  if (requestId) headers.set('x-request-id', requestId)
  if (API_KEY) headers.set('X-876-API-Key', API_KEY)
  // This is the enterprise app: declare the enterprise realm so a new identity
  // created through this entry point is stamped as a work/organization account.
  headers.set('X-876-Realm', 'enterprise')

  return headers
}
