import 'server-only'

export interface BillingProxyOptions {
  baseUrl?: string
  accessToken: string
  organizationId: string
  requestId?: string
  fetch?: typeof fetch
}

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'idempotency-key',
] as const
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'x-request-id'] as const

/** Proxies an authenticated frontend request to the standalone Billing API. */
export async function proxy876BillingRequest(
  request: Request,
  path: readonly string[],
  options: BillingProxyOptions
): Promise<Response> {
  if (path.some((segment) => segment === '.' || segment === '..')) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'billing/invalid-path',
          message: 'The Billing request path is invalid.',
        },
      },
      { status: 400 }
    )
  }

  const baseUrl = (options.baseUrl?.trim() || 'http://localhost:4004').replace(
    /\/$/,
    ''
  )
  const sourceUrl = new URL(request.url)
  const target = new URL(
    `/api/v1/${path.map(encodeURIComponent).join('/')}${sourceUrl.search}`,
    baseUrl
  )
  const headers = new Headers({
    Authorization: `Bearer ${options.accessToken}`,
    'x-billing-organization-id': options.organizationId,
  })
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (options.requestId) headers.set('x-request-id', options.requestId)

  try {
    const upstream = await (options.fetch ?? globalThis.fetch)(target, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : request.body,
      duplex: request.body ? 'half' : undefined,
      redirect: 'manual',
    } as RequestInit)
    const responseHeaders = new Headers()
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    responseHeaders.set('cache-control', 'no-store')
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: 'billing/unreachable',
          message: 'Could not reach the Billing service.',
        },
      },
      { status: 503 }
    )
  }
}
