import 'server-only'

import { createAuthLoginPath } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { isAccountUsable } from './account-validity'
import { canAccess, resolveAccessContext } from './access-context'
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

/** Requires an in-app capability after the organization context is established. */
export async function requireAppPermission(permission: string) {
  const result = await getInvoiceContextResult()
  if (result.status === 'signed-out') redirect(createAuthLoginPath('/'))
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status === 'unavailable') redirect('/unavailable')

  const outcome = await resolveAccessContext(
    result.context.userId,
    result.context.orgId
  )
  if (outcome.status === 'unavailable') redirect('/unavailable')
  if (!canAccess(outcome.context, permission)) redirect('/no-access')

  return outcome.context
}
