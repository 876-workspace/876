import type { ClientResult } from '@/types/api'
import { requestApiResult } from '@876/core/client'

export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(url, init)
}
