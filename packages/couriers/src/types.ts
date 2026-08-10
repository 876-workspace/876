/**
 * Shared client envelopes and primitives.
 */

export interface Error {
  code: string
  message: string
  param?: string
}

export type Result<T> = { data: T; error: null } | { data: null; error: Error }

export interface List<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  total_count: number | null
  url: string
}

export interface RequestOptions {
  signal?: AbortSignal
}

export interface ClientOptions {
  baseUrl?: string
  apiKey?: string
  /**
   * Short-lived OAuth access token for `portal` resources. Supply it from the
   * server-side session for each request; do not expose it as a client-side
   * environment variable.
   */
  accessToken?: string
  fetch?: typeof fetch
  requestId?: string
}

export interface IntegrationClientOptions {
  baseUrl?: string
  serviceKey?: string
  fetch?: typeof fetch
  requestId?: string
}

export interface AdminClientOptions {
  baseUrl?: string
  /**
   * The Couriers app API key. Every `admin` route runs `requireApiKey` before
   * `requireAdmin`, so the internal key alone is not enough to reach one.
   */
  apiKey?: string
  internalKey?: string
  fetch?: typeof fetch
  requestId?: string
}
