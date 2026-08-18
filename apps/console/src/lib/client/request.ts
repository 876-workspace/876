import type { ClientResult } from '@/types/api'
import { requestApiResult } from '@876/core/client'

const PREFIX_ROUTES = [
  ['/api/billing/accounts', '/api/billing-accounts'],
  ['/api/billing/subscriptions', '/api/billing-subscriptions'],
  ['/api/storage/apps', '/api/apps'],
  ['/api/storage/organizations', '/api/organizations'],
  ['/api/storage/users', '/api/users'],
  ['/api/widgets/features', '/api/widget-features'],
] as const

function replacePrefix(url: string, from: string, to: string): string {
  if (url === from) return to
  if (url.startsWith(`${from}/`) || url.startsWith(`${from}?`))
    return `${to}${url.slice(from.length)}`
  return url
}

/**
 * Keeps legacy client-module constants from leaking service topology into the
 * browser while those modules are migrated incrementally.
 */
export function consoleOwnedUrl(url: string): string {
  let owned = url
  for (const [from, to] of PREFIX_ROUTES) owned = replacePrefix(owned, from, to)

  return owned.replace(
    /^\/api\/billing\/integrations\/organizations\/([^/?]+)\/customers(?=\/|\?|$)/,
    '/api/organizations/$1/customers'
  )
}

export async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  return requestApiResult<T>(consoleOwnedUrl(url), init)
}
