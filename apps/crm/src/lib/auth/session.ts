import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import type { Current876Session, Signed876Session } from '@/types/auth'

import { verifySession876 } from './session-cookie'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'

export async function getAuthSession(options?: {
  ensureSignedIn?: boolean
}): Promise<Current876Session> {
  return getCachedSession(options?.ensureSignedIn)
}

const getCachedSession = cache(async function getCachedSession(
  ensureSignedIn?: boolean
): Promise<Current876Session> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) {
    if (ensureSignedIn) redirect('/login')
    return { user: null }
  }

  const session = await verifySession876(cookie.value)
  if (!session?.userId) {
    if (ensureSignedIn) redirect('/login')
    return { user: null }
  }

  return {
    user: {
      id: session.userId,
      email: session.email ?? '',
      accountType: session.accountType,
      orgId: session.orgId ?? null,
      firstName: session.firstName,
      lastName: session.lastName,
      avatar: session.avatar ?? null,
    },
    accessToken: session.accessToken,
  }
})

export function isSignedSession(
  session: Current876Session
): session is Signed876Session {
  return session.user !== null && session.user !== undefined
}
