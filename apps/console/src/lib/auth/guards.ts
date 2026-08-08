import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'
import { $876 } from '@/lib/876'
import { permissionsForRole } from '@/lib/permissions'
import { service } from '@/lib/service'
import { getAuthSession, isSignedSession } from './session'
import type { Access, RoutingUser, SessionUser } from '@/types/auth'

export const CONSOLE_ACCESS_PERMISSION = 'console:access'
const BOOTSTRAP_SUPER_ADMIN_EMAILS = new Set(['raheemdevs@gmail.com'])

export function hasPermission(
  user: Pick<Access, 'permissions'>,
  permission: string
): boolean {
  return user.permissions.includes(permission)
}

export async function requireSession(returnTo: string) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }
  return session.user
}

/**
 * The platform user record, memoized for the lifetime of one request.
 *
 * A single render reaches for this record from three unrelated places: the
 * bootstrap super-admin check, the shell's display hydration, and the
 * permission guard in whichever segment layout is being entered. Each one is a
 * Worker → FastAPI → Postgres round trip, and they all run *above* the nearest
 * `loading.tsx`, so the user waits on every one of them before a skeleton can
 * paint. Memoizing collapses them to a single trip.
 *
 * See `.claude/rules/performance-server-side.md` §3.9 — `cache()` is per
 * request, which is exactly the scope a session-derived read wants.
 */
const retrieveUser = cache(async function retrieveUser(userId: string) {
  const { data } = await $876.users.retrieve(userId)
  return data ?? null
})

export const findConsoleAccess = cache(async function findConsoleAccess(
  userId: string
): Promise<Access | null> {
  const bootstrapAccess = await findBootstrapSuperAdminAccess(userId)
  if (bootstrapAccess) return bootstrapAccess

  const row = await service.team.retrieve(userId)
  if (!row) return null
  return {
    id: row.userId,
    role: row.roleName,
    permissions: row.role.permissions,
    status: row.status,
  }
})

/**
 * The bootstrap super-admin grant, resolved without a network call where it can
 * be.
 *
 * This runs inside the permission guard of every segment layout, and a guard
 * cannot stream — content must not render before we know the viewer may see it.
 * So the guard has to be *cheap* rather than non-blocking, and fetching the
 * platform user to test one address against a one-entry set was the opposite:
 * a Worker -> FastAPI -> Postgres round trip on every navigation, ahead of any
 * paint.
 *
 * When the id being checked is the session's own, the sealed cookie already
 * carries that address. It is signed by the API and is the same trust root as
 * `session.user.id`, which authorization here already relies on completely — so
 * reading the address from it adds no attack surface. Forging one means holding
 * the sealing secret, and anyone holding that can simply claim a different id.
 *
 * The narrow trade-off: if this account's address changes, the grant survives
 * on an already-issued session until it expires, where the fetch would have
 * dropped it at once. A stale address can only ever *fail to match* the set, so
 * a mismatch withholds the grant rather than widening it.
 *
 * Checking another user's id still takes the authoritative path.
 */
async function findBootstrapSuperAdminAccess(
  userId: string
): Promise<Access | null> {
  const email = await resolveEmailForBootstrapCheck(userId)
  if (!email || !BOOTSTRAP_SUPER_ADMIN_EMAILS.has(email)) return null

  return {
    id: userId,
    role: 'super_admin',
    permissions: permissionsForRole('super_admin'),
    status: 'active',
  }
}

async function resolveEmailForBootstrapCheck(
  userId: string
): Promise<string | undefined> {
  const session = await getAuthSession()
  if (isSignedSession(session) && session.user.id === userId) {
    const sessionEmail = session.user.email?.trim().toLowerCase()
    if (sessionEmail) return sessionEmail
  }

  const data = await retrieveUser(userId)
  return data?.email?.trim().toLowerCase()
}

async function hydrateDisplay(
  access: Access,
  sessionUser?: Pick<SessionUser, 'email' | 'firstName' | 'lastName'>
): Promise<RoutingUser> {
  const base: RoutingUser = {
    ...access,
    firstName: sessionUser?.firstName?.trim() || null,
    lastName: sessionUser?.lastName?.trim() || null,
    email: sessionUser?.email.trim() ?? '',
    avatar: null,
    banned: false,
  }
  try {
    const data = await retrieveUser(access.id)
    if (!data) return base
    return {
      ...base,
      firstName: data.first_name?.trim() || base.firstName,
      lastName: data.last_name?.trim() || base.lastName,
      email: data.email?.trim() || base.email,
      avatar: data.avatar ?? null,
      banned: Boolean(data.banned),
    }
  } catch {
    return base
  }
}

async function requireAccess(userId: string): Promise<Access> {
  const access = await findConsoleAccess(userId)
  if (!access) redirect('/access-denied?reason=no-account')
  if (access.status !== 'active') redirect('/access-denied?reason=suspended')
  if (!hasPermission(access, CONSOLE_ACCESS_PERMISSION)) {
    redirect('/access-denied?reason=permission')
  }
  return access
}

export async function requireConsoleAccount(
  userId: string,
  sessionUser?: Pick<SessionUser, 'email' | 'firstName' | 'lastName'>
): Promise<RoutingUser> {
  const access = await requireAccess(userId)
  return hydrateDisplay(access, sessionUser)
}

export async function requireConsolePermission(
  userId: string,
  permission: string
): Promise<Access> {
  const access = await requireAccess(userId)
  if (!hasPermission(access, permission)) redirect('/')
  return access
}
