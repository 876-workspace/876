export type ClientError = { code: string; message: string }
export type Result<T> =
  { data: T; error: null } | { data: null; error: ClientError }
export type ClientOptions = {
  baseUrl?: string
  internalKey?: string
  fetch?: typeof fetch
  requestId?: string
}
