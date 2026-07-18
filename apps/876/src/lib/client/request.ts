import type { ClientResult } from '@/types/api'
import { requestApiResult } from '@876/core/client'

/**
 * Browser transport to the apps/876 route handlers (which call `$876`
 * server-side with the app API key). Mutation endpoints only.
 */
export async function post<T>(
  url: string,
  body: unknown
): Promise<ClientResult<T>> {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(url, init)
}
