import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { verifySession876 } from './session-cookie'
import type { Signed876Session, Current876Session } from '@/types/auth'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'

/**
 * Reads the Console session from the API-set session cookie.
 * Returns `{ user: null }` when not signed in.
 */
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
      firstName: session.firstName,
      lastName: session.lastName,
    },
    accessToken: session.accessToken,
  }
})

/**
 * Returns the access token from the session cookie, or null when signed out.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return null
  const session = await verifySession876(cookie.value)
  return session?.accessToken ?? null
}

/**
 * Clears the session cookie. Called on logout.
 * The Python API also clears the cookie server-side when /auth/logout is called.
 */
export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies()
  const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'
  try {
    cookieStore.delete({ name: COOKIE_NAME, path: '/' })
  } catch {
    cookieStore.delete(COOKIE_NAME)
  }
}

/** Type-guard for a signed-in session. */
export function isSignedSession(
  session: Current876Session
): session is Signed876Session {
  return session.user !== null && session.user !== undefined
}
