/**
 * Server-side transport helpers for auth/OAuth bridge routes.
 *
 * These helpers are intentionally lower-level than `coreRequest`: bridge routes
 * often need form bodies, streamed responses, bearer headers, and forwarded
 * `Set-Cookie` headers rather than `{ data, error }` JSON envelopes.
 *
 * @module @876/core/fetch/bridge
 */

import { resolve876ApiBaseUrl } from '../client'
import { authErrorMessages } from '../types/auth-errors'

const bridgeBaseUrlEnvKeys = [
  'API_URL',
  'NEXT_PUBLIC_876_API_URL',
  'NEXT_PUBLIC_API_URL',
] as const

export const DEFAULT_SERVER_API_BASE_URL = resolve876ApiBaseUrl(
  undefined,
  bridgeBaseUrlEnvKeys
)

const transientStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504])
const defaultRetryOptions = {
  attempts: 3,
  delayMs: 250,
  maxDelayMs: 1_000,
} satisfies Required<ApiBridgeRetryOptions>

export type ApiBridgeRequestInit = Omit<
  RequestInit,
  'body' | 'headers' | 'method'
> & {
  method?: RequestInit['method']
  headers?: HeadersInit
  body?: BodyInit | null
  baseUrl?: string
  search?: string
  next?: { revalidate?: number }
  fetch?: typeof fetch
  retry?: ApiBridgeRetryOptions | false
}

export type ApiBridgeRetryOptions = {
  attempts?: number
  delayMs?: number
  maxDelayMs?: number
}

/**
 * Builds a safe API sub-path from untrusted catch-all route segments.
 *
 * Returns `null` when any segment is a traversal token (`.`, `..`), empty, or
 * contains a slash/backslash — preventing a `[...path]` proxy from escaping its
 * intended prefix (e.g. `/auth/`) and reaching other API tiers with the app key
 * attached. `fetch` normalizes `..` in URLs, so this MUST be checked before the
 * segments reach `apiBridgeUrl`/`fetch`.
 */
export function buildSafeBridgePath(
  prefix: string,
  segments: string[]
): string | null {
  if (segments.length === 0) return null
  for (const segment of segments) {
    if (
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.includes('/') ||
      segment.includes('\\')
    ) {
      return null
    }
  }
  const normalizedPrefix = prefix.replace(/\/$/, '')
  const routePath = segments.map(encodeURIComponent).join('/')
  return `${normalizedPrefix}/${routePath}`
}

export function apiBridgeUrl(
  path: string,
  search = '',
  baseUrl = DEFAULT_SERVER_API_BASE_URL
): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${normalizedBase}${normalizedPath}${search}`
}

export async function fetchApiBridge(
  path: string,
  init: ApiBridgeRequestInit = {}
): Promise<Response> {
  const { baseUrl, fetch: fetchImpl, retry, search, ...requestInit } = init
  const request = requestInit as RequestInit & {
    next?: { revalidate?: number }
  }
  const retryOptions = resolveRetryOptions(retry)
  const url = apiBridgeUrl(path, search, baseUrl)

  for (let attempt = 1; attempt <= retryOptions.attempts; attempt += 1) {
    try {
      const response = await (fetchImpl ?? globalThis.fetch.bind(globalThis))(
        url,
        request
      )

      if (
        !shouldRetryStatus(response.status) ||
        attempt >= retryOptions.attempts
      )
        return response
    } catch (error) {
      if (
        request.signal?.aborted ||
        isAbortError(error) ||
        attempt >= retryOptions.attempts
      ) {
        return bridgeNetworkErrorResponse()
      }
    }

    await waitForRetryDelay(attempt, retryOptions, request.signal)
  }

  return bridgeNetworkErrorResponse()
}

/**
 * Headers that must NOT be copied verbatim from the upstream API response.
 *
 * `fetch` (undici) transparently decompresses the response body but leaves the
 * original `content-encoding` and (compressed) `content-length` on the Headers
 * object. Forwarding them alongside the now-decompressed `body` makes the
 * browser try to decode plain JSON as gzip/br — it fails with an empty
 * "no response/preview" body even though the upstream returned 200. `set-cookie`
 * is handled separately so it can be appended (multiple cookies preserved), and
 * hop-by-hop framing headers are dropped for the same correctness reason.
 */
const strippedBridgeHeaders = new Set([
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
])

export function copyBridgeResponse(apiResponse: Response): Response {
  const headers = new Headers()

  for (const [key, value] of apiResponse.headers.entries()) {
    if (!strippedBridgeHeaders.has(key.toLowerCase())) headers.set(key, value)
  }

  const response = new Response(apiResponse.body, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
    headers,
  })

  appendSetCookies(apiResponse, response)

  return response
}

export function appendSetCookies(
  apiResponse: Response,
  response: { headers: Headers }
): void {
  for (const cookie of getSetCookies(apiResponse.headers)) {
    response.headers.append('set-cookie', cookie)
  }
}

export function getSetCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie

  if (getSetCookie) return getSetCookie.call(headers)

  const cookie = headers.get('set-cookie')
  return cookie ? [cookie] : []
}

function resolveRetryOptions(
  retry: ApiBridgeRetryOptions | false | undefined
): Required<ApiBridgeRetryOptions> {
  if (retry === false) return { attempts: 1, delayMs: 0, maxDelayMs: 0 }

  return {
    attempts: Math.max(1, retry?.attempts ?? defaultRetryOptions.attempts),
    delayMs: Math.max(0, retry?.delayMs ?? defaultRetryOptions.delayMs),
    maxDelayMs: Math.max(
      0,
      retry?.maxDelayMs ?? defaultRetryOptions.maxDelayMs
    ),
  }
}

function shouldRetryStatus(status: number): boolean {
  return transientStatusCodes.has(status)
}

function bridgeNetworkErrorResponse(): Response {
  return Response.json(
    {
      data: null,
      error: {
        code: 'auth/network-error',
        message: authErrorMessages['auth/network-error'],
      },
    },
    { status: 503 }
  )
}

function isAbortError(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  )
}

function waitForRetryDelay(
  attempt: number,
  retry: Required<ApiBridgeRetryOptions>,
  signal?: AbortSignal | null
): Promise<void> {
  if (signal?.aborted || retry.delayMs === 0) return Promise.resolve()

  const delay = Math.min(retry.delayMs * 2 ** (attempt - 1), retry.maxDelayMs)
  return new Promise((resolve) => setTimeout(resolve, delay))
}
