/**
 * Shared HTTP transport for 876 client packages.
 *
 * Owns the mechanics every tier client repeats — URL resolution against
 * absolute or same-origin base URLs, query serialization, JSON headers and
 * body handling, and safe JSON payload parsing. It deliberately does **not**
 * shape errors: each tier package maps the raw transport result onto its own
 * client-safe error contract (`auth/*` with Zod validation in `@876/sdk`,
 * `admin/*` in `@876/admin`).
 *
 * @module @876/core/client
 */

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
}

/** The raw transport outcome before tier-specific error shaping. */
export type ClientHttpResult =
  | { networkError: false; ok: boolean; status: number; payload: unknown }
  | { networkError: true; ok: false; status: 0; payload: null }

const jsonHeaders = { 'Content-Type': 'application/json' } as const

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

    return {
      networkError: false,
      ok: response.ok,
      status: response.status,
      payload,
    }
  } catch {
    return { networkError: true, ok: false, status: 0, payload: null }
  }
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
