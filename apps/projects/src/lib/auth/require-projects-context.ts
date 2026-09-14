import 'server-only'

import { redirect } from 'next/navigation'

import {
  canAccess,
  canAccessModule,
  resolveAccessContext,
} from './access-context'
import { getProjectsContextResult } from './context'

export async function requireProjectsContext() {
  const result = await getProjectsContextResult()
  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status !== 'ok') redirect('/unavailable')

  return result.context
}

/** Requires an in-app permission after the organization context is established. */
export async function requireAppPermission(permission: string) {
  const context = await requireProjectsContext()
  const outcome = await resolveAccessContext(context.userId, context.orgId)

  if (outcome.status === 'unavailable') redirect('/unavailable')
  if (!canAccess(outcome.context, permission)) redirect('/no-access')

  return outcome.context
}

/**
 * Requires both an organization module entitlement and the acting user's app
 * permission. Use this for routes belonging to a commercially gated module.
 */
export async function requireAppAccess(requirement: {
  module: string
  permission: string
}) {
  const context = await requireProjectsContext()
  const outcome = await resolveAccessContext(context.userId, context.orgId)

  if (outcome.status === 'unavailable') redirect('/unavailable')
  if (!canAccessModule(outcome.context, requirement.module))
    redirect('/no-access')
  if (!canAccess(outcome.context, requirement.permission))
    redirect('/no-access')

  return outcome.context
}
