import 'server-only'

import { redirect } from 'next/navigation'

import { getProjectsContextResult } from './context'
import { canAccess, resolveAccessContext } from './access-context'

export async function requireProjectsContext() {
  const result = await getProjectsContextResult()
  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status !== 'ok') redirect('/unavailable')

  return result.context
}

/** Requires an in-app capability after the organization context is established. */
export async function requireAppPermission(permission: string) {
  const context = await requireProjectsContext()
  const outcome = await resolveAccessContext(context.userId, context.orgId)

  if (outcome.status === 'unavailable') redirect('/unavailable')
  if (!canAccess(outcome.context, permission)) redirect('/no-access')

  return outcome.context
}
