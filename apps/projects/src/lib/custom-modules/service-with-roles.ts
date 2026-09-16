import 'server-only'

import { create876ProjectsServiceClient } from '@876/projects/service'

function serviceBaseUrl(): string {
  return (
    process.env.PROJECTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_PROJECTS_API_URL?.trim() ||
    'http://localhost:4030'
  )
}

function serviceInternalKey(): string {
  const internalKey = process.env.PROJECTS_INTERNAL_KEY?.trim()
  if (!internalKey) throw new Error('PROJECTS_INTERNAL_KEY is required')
  return internalKey
}

/**
 * A service client that forwards the caller's resolved role keys in
 * `x-app-role-keys`. The keys come from the server-resolved access context —
 * never from request bodies, query strings, or browser headers.
 */
export function serviceWithRoleKeys(roleKeys: readonly string[]) {
  const headerValue = roleKeys
    .map((key) => key.trim())
    .filter((key) => key !== '')
    .join(',')
  const baseFetch: typeof fetch = globalThis.fetch.bind(globalThis)
  const fetchWithRoles: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers)
    headers.set('x-app-role-keys', headerValue)
    return baseFetch(input, { ...init, headers })
  }
  return create876ProjectsServiceClient({
    baseUrl: serviceBaseUrl(),
    internalKey: serviceInternalKey(),
    fetch: fetchWithRoles,
  })
}
