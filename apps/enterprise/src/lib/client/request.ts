import type { ClientResult } from '@/types/api'
import { requestApiResult } from '@876/core/client'

/**
 * Thin browser transport for client-initiated mutations. Calls the app's own
 * `/api/*` route handlers (which authorize and forward to `$876`), never the
 * FastAPI core directly. Returns the `{ data, error }` envelope those handlers
 * emit.
 */
export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(url, init)
}
