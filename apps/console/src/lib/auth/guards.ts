import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'
import { $876 } from '@/lib/876'
import {
  CONSOLE_ACCESS_PERMISSION,
  hasPermission,
} from '@/lib/permissions'
import { service } from '@/lib/service'
import { getAuthSession, isSignedSession } from './session'
import type { Access, RoutingUser, SessionUser } from '@/types/auth'

export async function requireSession(returnTo: string) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)

  return session.user
}

/** One platform identity lookup per render, shared by every guard that needs it. */
const retrievePlatformUserResult = cache(
  async function retrievePlatformUserResult(userId: string) {
    return $876.users.admin.retrieve({ id: userId })
  }
)

async function retrievePlatformUser(userId: string) {
  const { data } = await retrievePlatformUserResult(userId)
  return data ?? null
}

type PlatformUserData = Awaited<ReturnType<typeof retrievePlatformUser>>

/** Resolve Console authorization exclusively from Console's persisted team RBAC. */
export const findConsoleAccess = cache(async function findConsoleAccess(
  userId: string
): Promise<Access | null> {
  const member = await service.team.retrieve(userId)
  if (!member) return null

  return {
    id: member.userId,
    role: member.roleName,
    permissions: member.role.permissions,
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

async function requireAccess(
  userId: string
): Promise<{ access: Access; platformUser: PlatformUserData }> {
  const access = await findConsoleAccess(userId)
  if (!access) redirect('/access-denied?reason=no-account')

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
  if (!hasPermission(access, CONSOLE_ACCESS_PERMISSION))
    redirect('/access-denied?reason=permission')

  return { access, platformUser }
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
  const { access } = await requireAccess(userId)
  if (!hasPermission(access, permission)) redirect('/')

  return access
}
