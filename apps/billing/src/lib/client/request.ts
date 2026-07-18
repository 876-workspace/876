'use client'

import type { ClientResult } from '@/types/api'
import { requestApiResult } from '@876/core/client'

/** Standard browser transport for Billing's same-origin route handlers. */
export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(url, init)
}
