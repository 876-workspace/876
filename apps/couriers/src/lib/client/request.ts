'use client'

import { requestApiResult } from '@876/core/client'

import type { ClientResult } from '@/types/api'

/** Sends a same-origin Couriers request and returns a canonical result value. */
export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(url, init)
}
