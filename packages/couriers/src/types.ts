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
  internalKey?: string
  fetch?: typeof fetch
  requestId?: string
}
