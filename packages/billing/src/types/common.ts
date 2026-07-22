/**
 * Shared client envelopes, money primitives, and request options.
 */

/**
 * A client-safe error returned by 876 Billing.
 */
export interface Error {
  /**
   * A machine-readable error code.
   */
  code: string

  /**
   * A human-readable message that's safe to show in the UI.
   */
  message: string

  /**
   * The parameter that caused the error, if applicable.
   */
  param?: string
}

/**
 * Result envelope returned by every Billing client method.
 */
export type Result<T> = { data: T; error: null } | { data: null; error: Error }

/**
 * A list of resources returned by a collection endpoint.
 */
export interface List<T> {
  /**
   * String representing the object's type. Objects of the same type share the same value. Always has the value `list`.
   */
  object: 'list'

  /**
   * The list of resources returned for this page.
   */
  data: T[]

  /**
   * True if this list has another page of items after this one that can be fetched.
   */
  has_more: boolean

  /**
   * The total number of matching items, when the endpoint provides a count.
   */
  total_count: number | null

  /**
   * The URL where this list can be accessed.
   */
  url: string
}

/**
 * Options shared by the tenant-scoped Billing client.
 */
export interface ClientOptions {
  /**
   * Billing API origin. Defaults to same-origin in a browser and port 4004 on the server.
   */
  baseUrl?: string

  /**
   * Credentials mode used for same-origin frontend gateways.
   */
  credentials?: RequestCredentials

  /**
   * Short-lived delegated 876 access token. Required by the standalone API.
   */
  accessToken?: string

  /**
   * Core organization whose Billing workspace should be used.
   */
  organizationId?: string

  /**
   * Optional fetch implementation for tests or custom runtimes.
   */
  fetch?: typeof fetch

  /**
   * Optional request ID propagated to Billing logs.
   */
  requestId?: string
}

/**
 * Optional per-request configuration.
 */
export interface RequestOptions {
  /**
   * Optional signal used to abort the request.
   */
  signal?: AbortSignal
}

/**
 * Money represented in a currency's smallest unit.
 */
export type MinorAmount = number | string

/**
 * JSON-safe provider configuration. Secrets must be external references.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
