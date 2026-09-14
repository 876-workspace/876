import 'server-only'

import { createAuthLoginPath } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { isAccountUsable } from './account-validity'
import {
  canAccess,
  hasAccessFeature,
  resolveAccessContext,
} from './access-context'
import { getInvoiceContextResult } from './context'
import { getAuthSession, isSignedSession } from './session'

/**
 * Sends a viewer without a *usable* session to this app's own login, keeping
 * its place.
 *
 * Checking the cookie signature is not enough — see `isAccountUsable`, which
 * owns that rule and is shared with the context resolver so the two cannot
 * disagree about whether a session is still valid.
 */
export const requireValidSession = cache(async function requireValidSession(
  returnTo = '/'
) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect(createAuthLoginPath(returnTo))

  if (!(await isAccountUsable(session.user.id)))
    redirect(createAuthLoginPath(returnTo))

  return session.user
})

async function requireAccessContext() {
  const result = await getInvoiceContextResult()
  if (result.status === 'signed-out') redirect(createAuthLoginPath('/'))
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status === 'unavailable') redirect('/unavailable')

  const outcome = await resolveAccessContext(
    result.context.userId,
    result.context.orgId
  )
  if (outcome.status === 'unavailable') redirect('/unavailable')

  return outcome.context
}

/** Requires an in-app capability after the organization context is established. */
export async function requireAppPermission(permission: string) {
  const context = await requireAccessContext()
  if (!canAccess(context, permission)) redirect('/no-access')
  return context
}

/**
 * Requires both authorization and rollout/entitlement state.
 *
 * Permission denial is an authorization result. A disabled feature means the
 * product surface is not part of this organization's Invoice configuration and
 * follows Billing's established feature-gate behavior by returning to app home.
 */
export async function requireAppCapability(params: {
  permission: string
  feature: string
}) {
  const context = await requireAccessContext()
  if (!canAccess(context, params.permission)) redirect('/no-access')
  if (!hasAccessFeature(context, params.feature)) redirect('/')
  return context
}
