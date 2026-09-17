'use client'

import { requestApiResult } from '@876/core/client'
import type { ClientResult } from '@/types/client'

export type { ClientResult }

export function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(input, init)
}
