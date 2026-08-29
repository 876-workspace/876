import 'server-only'

import { can, hasFeature, type AccessContext } from '@876/core/access'
import { createAuthLoginPath } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { $876 } from '@/lib/876'
import { CONSOLE_ACCESS_PERMISSION } from '@/lib/permissions'
import {
  resolveAccessContext,
  resolveConsoleGrant,
} from '@/lib/auth/access-context'
import { getAuthSession, isSignedSession } from './session'
import type { Access, RoutingUser, SessionUser } from '@/types/auth'

export async function requireSession(returnTo: string) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect(createAuthLoginPath(returnTo))

  return session.user
}

/** One platform identity lookup per render, shared by every guard that needs it. */
const retrievePlatformUserResult = cache(
  async function retrievePlatformUserResult(userId: string) {
    return $876.users.admin.retrieve({ id: userId })
  }
)

type PlatformUserData = Awaited<
  ReturnType<typeof retrievePlatformUserResult>
>['data']

/** Resolve Console authorization exclusively from Console's persisted team RBAC. */
export const findConsoleAccess = cache(async function findConsoleAccess(
  userId: string
): Promise<Access | null> {
  const context = await resolveAccessContext(userId)
  if (!context) return null

  const member = await resolveConsoleGrant(userId)
  if (!member) return null

  return {
    id: member.userId,
    role: member.roleName,
    permissions: [...context.permissions],
    status: member.status,
  }
})

function hydrateDisplay(
  access: Access,
  platformUser: PlatformUserData,
  sessionUser?: Pick<SessionUser, 'email' | 'firstName' | 'lastName'>
): RoutingUser {
  const base: RoutingUser = {
    ...access,
    firstName: sessionUser?.firstName?.trim() || null,
    lastName: sessionUser?.lastName?.trim() || null,
    email: sessionUser?.email.trim() ?? '',
    avatar: null,
    banned: false,
  }
  if (!platformUser) return base

  return {
    ...base,
    firstName: platformUser.first_name?.trim() || base.firstName,
    lastName: platformUser.last_name?.trim() || base.lastName,
    email: platformUser.email?.trim() || base.email,
    avatar: platformUser.avatar ?? null,
    banned: Boolean(platformUser.banned),
  }
}

async function requireAccess(userId: string): Promise<{
  access: Access
  context: AccessContext
  platformUser: PlatformUserData
}> {
  const context = await resolveAccessContext(userId)
  const access = await findConsoleAccess(userId)
  if (!context || !access) redirect('/access-denied?reason=no-account')

  // Console owns authorization through its team row, while the platform owns
  // identity lifecycle. An explicit deleted/disabled platform account signs out;
  // an infrastructure failure does not invalidate an otherwise valid admin.
  let platformUser: PlatformUserData = null
  let accountUnavailable = false

  try {
    const result = await retrievePlatformUserResult(userId)
    platformUser = result.data ?? null
    accountUnavailable =
      result.error?.code === 'user/not-found' ||
      Boolean(
        platformUser &&
        (platformUser.banned ||
          (platformUser.status && platformUser.status !== 'active'))
      )
  } catch {
    // Platform outage — preserve the valid Console session.
  }

  if (accountUnavailable) redirect('/login')
  if (access.status !== 'active') redirect('/access-denied?reason=suspended')
  if (!can(context, CONSOLE_ACCESS_PERMISSION))
    redirect('/access-denied?reason=permission')

  return { access, context, platformUser }
}

export async function requireConsoleAccount(
  userId: string,
  sessionUser?: Pick<SessionUser, 'email' | 'firstName' | 'lastName'>
): Promise<RoutingUser> {
  const { access, platformUser } = await requireAccess(userId)

  return hydrateDisplay(access, platformUser, sessionUser)
}

export async function requireConsolePermission(
  userId: string,
  permission: string
): Promise<Access> {
  const { access, context } = await requireAccess(userId)
  if (!can(context, permission)) redirect('/')

  return access
}

export async function requireConsoleFeature(
  userId: string,
  feature: string
): Promise<Access> {
  const { access, context } = await requireAccess(userId)
  if (!hasFeature(context, feature)) redirect('/')

  return access
}

export async function requireConsoleCapability(
  userId: string,
  requirement: { permission?: string; feature?: string }
): Promise<Access> {
  const { access, context } = await requireAccess(userId)

  if (requirement.permission && !can(context, requirement.permission)) redirect('/')
  if (requirement.feature && !hasFeature(context, requirement.feature)) redirect('/')

  return access
}
