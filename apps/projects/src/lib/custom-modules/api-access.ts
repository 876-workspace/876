import 'server-only'

import { resolveAccessContext } from '@/lib/auth/access-context'

import { callerRoleKeys } from './module-access'

/**
 * Resolves the caller's role keys from the server-side access context. Route
 * handlers pass these to the owning service; the browser never supplies them.
 */
export async function resolveCallerRoleKeys(
  userId: string,
  orgId: string
): Promise<string[]> {
  const outcome = await resolveAccessContext(userId, orgId)
  if (outcome.status !== 'ok') return []
  return callerRoleKeys(outcome.context.permissions)
}

export function serviceErrorStatus(code: string): 400 | 404 {
  return code.includes('not-found') ? 404 : 400
}
