'use client'

import type { ClientResult } from '@/types/api'
import { requestApiResult } from '@876/core/client'

function appOwnedUrl(url: string): string {
  if (url === '/api/v1') return '/api'
  if (url.startsWith('/api/v1/')) return `/api/${url.slice('/api/v1/'.length)}`
  return url
}

/** Standard browser transport for Billing's same-origin, app-owned routes. */
export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(appOwnedUrl(url), init)
}
