'use client'

import { requestApiResult, type ClientApiResult } from '@876/core/client'

export type ClientResult<T> = ClientApiResult<T>

export function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(input, init)
}
