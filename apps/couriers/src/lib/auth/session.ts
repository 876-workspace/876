import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'

import { isError } from '@876/core/errors'

import { verifySession876 } from './session-cookie'
import type {
  Current876Session,
  Session876Result,
  Signed876Session,
} from '@/types/auth'

export type {
  Session876Result,
  SessionUser,
  Signed876Session,
  Current876Session,
} from '@/types/auth'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'

/**
 * Reads the current server auth session from the API session cookie.
 * Returns the session or `{ user: null }` when not signed in.
 */
export async function getAuthSession(): Promise<
  Session876Result<Current876Session>
> {
  return getCachedSession()
}

const getCachedSession = cache(async function getCachedSession(): Promise<
  Session876Result<Current876Session>
> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(COOKIE_NAME)

    if (!cookie?.value) return { user: null }

    const session = await verifySession876(cookie.value)
    if (!session?.userId) return { user: null }

    return {
      user: {
        id: session.userId,
        email: session.email ?? '',
        realm: session.realm,
        orgId: session.orgId,
        firstName: session.firstName,
        lastName: session.lastName,
        emailVerified: session.emailVerified,
        avatar: session.avatar,
        username: session.username,
      },
      accessToken: session.accessToken,
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    return error as Session876Result<never>
  }
})

/** Type-guard checking if a session result contains a signed-in user. */
export function isSignedSession(
  session: Session876Result<Current876Session>
): session is Signed876Session {
  return (
    session !== null &&
    typeof session === 'object' &&
    !isError(session) &&
    'user' in session &&
    session.user !== null &&
    session.user !== undefined
  )
}

/**
 * Returns true when the error is a Next.js redirect control-flow error.
 */
export function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as Record<string, unknown>).digest === 'string' &&
    (error as Record<string, string>).digest.startsWith('NEXT_REDIRECT')
  )
}

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
