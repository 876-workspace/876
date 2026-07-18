import 'server-only'

import { redirect } from 'next/navigation'
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

export async function findConsoleAccess(
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
}

async function findBootstrapSuperAdminAccess(
  userId: string
): Promise<Access | null> {
  const { data } = await $876.users.retrieve(userId)
  const email = data?.email?.trim().toLowerCase()
  if (!email || !BOOTSTRAP_SUPER_ADMIN_EMAILS.has(email)) return null

  return {
    id: userId,
    role: 'super_admin',
    permissions: permissionsForRole('super_admin'),
    status: 'active',
  }
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
    const { data } = await $876.users.retrieve(access.id)
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
