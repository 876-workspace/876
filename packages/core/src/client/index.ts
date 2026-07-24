/**
 * `@876/core/client` — the shared runtime every 876 client package builds on.
 *
 * Tier packages (`@876/sdk`, `@876/admin`, future `@876/<product>` clients)
 * compose resource factories over this runtime: base-URL/env resolution and
 * the JSON transport live here once; credential headers and error shaping
 * stay tier-specific.
 *
 * This module is intentionally a single file with no relative imports. It is
 * consumed as raw source through the package `exports` map, and is the one
 * multi-symbol core subpath imported by the `NodeNext` `@876/sdk` build —
 * keeping it self-contained avoids the `.js`-vs-extensionless resolution split
 * between Turbopack (source bundling) and `tsc --moduleResolution nodenext`.
 *
 * @module @876/core/client
 */

// ── Runtime primitives ──────────────────────────────────────────────────────

/**
 * Reads `process.env` defensively. Client packages are bundled into browser
 * and server builds; Next.js inlines `NODE_ENV` and `NEXT_PUBLIC_*` at build
 * time, and browser bundles may have no `process` global at all.
 */
export function readClientEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env ?? {}
  )
}

export const DEFAULT_DEVELOPMENT_API_BASE_URL = 'http://localhost:4000'
export const DEFAULT_PRODUCTION_API_BASE_URL =
  'https://eight76-api.onrender.com'

const PREVIEW_API_PORT = '4000'

/**
 * Forwarded-port hostname shapes for the remote dev workspaces we support.
 * Each pattern captures the parts around the port so it can be swapped for the
 * API port, letting a browser on a forwarded app origin find the forwarded API.
 *
 *   Codespaces   <name>-<port>.app.github.dev       — port as suffix
 *   Ona/Gitpod   <port>--<env-id>.<cluster>.gitpod.dev — port as prefix
 */
const PREVIEW_HOST_PATTERNS: readonly {
  pattern: RegExp
  replacement: string
}[] = [
  {
    pattern: /-\d+(\.app\.github\.dev)$/,
    replacement: `-${PREVIEW_API_PORT}$1`,
  },
  { pattern: /^\d+(--.+\.gitpod\.dev)$/, replacement: `${PREVIEW_API_PORT}$1` },
]

/**
 * Resolves a client base URL from an explicit option or ordered env keys.
 *
 * An explicit `baseUrl` always wins. Otherwise the first defined env var in
 * `envKeys` is used. Returns `undefined` when nothing matches so each tier
 * package decides its own fallback (dev localhost, request-time error, …).
 *
 * @param baseUrl - Explicit base URL passed to the client factory.
 * @param envKeys - Env var names to try, in tier-specific precedence order.
 * @returns The resolved base URL, or `undefined` when unconfigured.
 */
export function resolveClientBaseUrl(
  baseUrl: string | undefined,
  envKeys: readonly string[]
): string | undefined {
  if (baseUrl) return baseUrl

  const env = readClientEnv()
  for (const key of envKeys) {
    const value = env[key]
    if (value) return value
  }

  return undefined
}

/**
 * Resolves the 876 API URL with the platform production API as the final
 * production fallback. Local development still falls back to the local API
 * server, and browser-side remote-workspace previews (Codespaces, Ona/Gitpod)
 * derive the matching forwarded port when no env var is configured.
 */
export function resolve876ApiBaseUrl(
  baseUrl: string | undefined,
  envKeys: readonly string[]
): string {
  const configured = resolveClientBaseUrl(baseUrl, envKeys)
  if (configured) return configured

  const previewUrl = resolvePreviewApiBaseUrl()
  if (previewUrl && !isProductionEnv()) return previewUrl

  return isProductionEnv()
    ? DEFAULT_PRODUCTION_API_BASE_URL
    : DEFAULT_DEVELOPMENT_API_BASE_URL
}

/** Returns whether the current build runs in production mode. */
export function isProductionEnv(): boolean {
  return readClientEnv().NODE_ENV === 'production'
}

function resolvePreviewApiBaseUrl(): string | undefined {
  const location = (
    globalThis as { location?: { hostname: string; protocol: string } }
  ).location
  if (!location) return undefined

  for (const { pattern, replacement } of PREVIEW_HOST_PATTERNS) {
    const apiHost = location.hostname.replace(pattern, replacement)
    if (apiHost !== location.hostname) return `${location.protocol}//${apiHost}`
  }

  return undefined
}

/**
 * A resource factory: binds a tier runtime to a `<resource>.<verb>` method
 * group. Tier and product clients are composed from these — the client
 * factory creates one runtime and passes it to each resource factory it
 * includes, so a package's surface is exactly the set of factories it
 * composes (admin-only operations never exist in consumer packages).
 */
export type ResourceFactory<TRuntime, TResource> = (
  runtime: TRuntime
) => TResource

// ── HTTP transport ───────────────────────────────────────────────────────────
//
// Owns the mechanics every tier client repeats — URL resolution against
// absolute or same-origin base URLs, query serialization, JSON headers and
// body handling, and safe JSON payload parsing. It deliberately does **not**
// shape errors: each tier package maps the raw transport result onto its own
// client-safe error contract (`auth/*` with Zod validation in `@876/sdk`,
// `admin/*` in `@876/admin`).

/** HTTP methods used by 876 client packages. */
export type ClientHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Transport configuration a tier runtime provides for each request. */
export type ClientTransport = {
  /** Base URL requests are resolved against (absolute or same-origin path). */
  baseUrl: string
  /** Fetch implementation (injectable for tests and custom runtimes). */
  fetch: typeof fetch
}

/** A single request sent through {@link sendClientRequest}. */
export type ClientRequestInit = {
  method: ClientHttpMethod
  /** Endpoint path, resolved against the transport base URL. */
  path: string
  /** JSON-serialized request body (omitted when `undefined`). */
  body?: unknown
  /** Query parameters; `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | undefined> | undefined
  /** Extra headers merged over the JSON defaults (e.g. credential headers). */
  headers?: Record<string, string> | undefined
  /** Optional AbortSignal to cancel the request. */
  signal?: AbortSignal | undefined
  /** Credentials mode; only set on the request when provided. */
  credentials?: RequestCredentials | undefined
  /** Retry transient transport failures. Defaults to a small retry budget. */
  retry?: ClientRetryOptions | false | undefined
}

export type ClientRetryOptions = {
  attempts?: number
  delayMs?: number
  maxDelayMs?: number
}

/** The raw transport outcome before tier-specific error shaping. */
export type ClientHttpResult =
  | { networkError: false; ok: boolean; status: number; payload: unknown }
  | { networkError: true; ok: false; status: 0; payload: null }

/** Client-safe error returned by same-origin application transports. */
export interface ClientAppError {
  /** Stable machine-readable error code. */
  code: string
  /** Human-readable error message. */
  message: string
}

/** Canonical result returned by same-origin application transports. */
export type ClientApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ClientAppError }

/** Shared error returned when a request cannot reach the server. */
export const NETWORK_OFFLINE_ERROR = {
  code: 'network/offline',
  message: 'No internet connection. Check your connection and try again.',
} as const satisfies ClientAppError

/** Shared error returned when a server response violates the API contract. */
export const CLIENT_INVALID_RESPONSE_ERROR = {
  code: 'client/invalid-response',
  message: 'The server returned an invalid response. Please try again.',
} as const satisfies ClientAppError

const jsonHeaders = { 'Content-Type': 'application/json' } as const
const transientStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504])
const defaultRetryOptions = {
  attempts: 3,
  delayMs: 250,
  maxDelayMs: 1_000,
} satisfies Required<ClientRetryOptions>

/**
 * Sends a same-origin application request and validates its result envelope.
 *
 * Expected API and network failures resolve as values. Only the canonical
 * `{ data, error }` envelope is accepted, and server-only HTTP metadata is
 * never copied into the returned error.
 */
export async function requestApiResult<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchImplementation: typeof fetch = globalThis.fetch
): Promise<ClientApiResult<T>> {
  const headers = new Headers(init?.headers)
  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')

  try {
    const response = await fetchImplementation(input, { ...init, headers })

    return readApiResult<T>(response)
  } catch {
    return { data: null, error: NETWORK_OFFLINE_ERROR }
  }
}

/** Validates a Fetch response as a canonical application result envelope. */
export async function readApiResult<T>(
  response: Response
): Promise<ClientApiResult<T>> {
  const payload: unknown = await response.json().catch(() => null)
  if (!isApiResultEnvelope(payload)) return invalidClientResponse()

  if (payload.error !== null) {
    const error = toClientAppError(payload.error)

    return error ? { data: null, error } : invalidClientResponse()
  }

  if (!response.ok) return invalidClientResponse()

  return { data: payload.data as T, error: null }
}

function isApiResultEnvelope(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Object.prototype.hasOwnProperty.call(payload, 'data') &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.keys(payload).every((key) => key === 'data' || key === 'error')
  )
}

function toClientAppError(error: unknown): ClientAppError | null {
  if (typeof error !== 'object' || error === null) return null

  const record = error as Record<string, unknown>
  if (
    typeof record.code !== 'string' ||
    record.code.trim() === '' ||
    typeof record.message !== 'string' ||
    record.message.trim() === '' ||
    'httpStatus' in record ||
    'status' in record
  )
    return null

  return { code: record.code, message: record.message }
}

function invalidClientResponse<T>(): ClientApiResult<T> {
  return { data: null, error: CLIENT_INVALID_RESPONSE_ERROR }
}

/**
 * Sends a JSON request and returns the raw `{ ok, status, payload }` outcome.
 *
 * Network/fetch failures resolve to `{ networkError: true }` instead of
 * throwing; an unparseable response body resolves with a `null` payload.
 * Callers map the outcome onto their tier's `{ data, error }` envelope.
 *
 * @param transport - Base URL and fetch implementation.
 * @param init - The request to send.
 * @returns A Promise resolving to the raw transport result.
 */
export async function sendClientRequest(
  transport: ClientTransport,
  init: ClientRequestInit
): Promise<ClientHttpResult> {
  const retry = resolveRetryOptions(init.retry)

  for (let attempt = 1; attempt <= retry.attempts; attempt += 1) {
    try {
      const requestInit: RequestInit = {
        method: init.method,
        headers: { ...jsonHeaders, ...init.headers },
      }

      if (init.credentials) requestInit.credentials = init.credentials
      if (init.signal) requestInit.signal = init.signal
      if (init.body !== undefined) requestInit.body = JSON.stringify(init.body)

      const response = await transport.fetch(
        resolveClientUrl(transport.baseUrl, init.path, init.query),
        requestInit
      )
      const payload: unknown = await response.json().catch(() => null)
      const result = {
        networkError: false,
        ok: response.ok,
        status: response.status,
        payload,
      } as const

      if (
        !shouldRetryStatus(init.method, response.status) ||
        attempt >= retry.attempts
      )
        return result
    } catch (error) {
      if (
        init.signal?.aborted ||
        isAbortError(error) ||
        attempt >= retry.attempts
      )
        return { networkError: true, ok: false, status: 0, payload: null }
    }

    await waitForRetryDelay(attempt, retry, init.signal)
  }

  return { networkError: true, ok: false, status: 0, payload: null }
}

function resolveRetryOptions(
  retry: ClientRetryOptions | false | undefined
): Required<ClientRetryOptions> {
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

function shouldRetryStatus(method: ClientHttpMethod, status: number): boolean {
  return method === 'GET' && transientStatusCodes.has(status)
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
  retry: Required<ClientRetryOptions>,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted || retry.delayMs === 0) return Promise.resolve()

  const delay = Math.min(retry.delayMs * 2 ** (attempt - 1), retry.maxDelayMs)
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/** Serializes defined params into a `?key=value` query string (or `''`). */
export function buildClientQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

/**
 * Resolves a path against an absolute or same-origin base URL, appending
 * query parameters when present.
 */
export function resolveClientUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  const queryString = query ? buildClientQuery(query) : ''
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  // Absolute URL: use the URL constructor for proper resolution.
  if (base.startsWith('http://') || base.startsWith('https://'))
    return `${new URL(path, base).toString()}${queryString}`

  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleanPath}${queryString}`
}
