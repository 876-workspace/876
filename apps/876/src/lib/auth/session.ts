import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { isError } from '@876/core/errors'

import { verifySession876, type Session876Account } from './session-cookie'

/** A read result that is either the 876 session value or a thrown error. */
export type Session876Result<T> = T | Error

/**
 * Consumer session layer. The Python API sets an HttpOnly session cookie on
 * every auth-completing response. This module reads and decodes that cookie
 * for server-side rendering and routing decisions.
 */

/** User shape surfaced from the session cookie. */
export type SessionUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  emailVerified?: boolean
  avatar?: string | null
  username?: string | null
}

/** A signed-in 876 session. */
export type Signed876Session = {
  user: SessionUser
  accessToken?: string
}

/** Current 876 session — either signed-in or not. */
export type Current876Session = Signed876Session | { user: null }

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'

/**
 * Reads the current server auth session from the API session cookie.
 * Returns the session or `{ user: null }` when not signed in.
 */
export async function getAuthSession(options?: {
  ensureSignedIn?: boolean
}): Promise<Session876Result<Current876Session>> {
  return getCachedSession(options?.ensureSignedIn)
}

const getCachedSession = cache(async function getCachedSession(
  ensureSignedIn?: boolean
): Promise<Session876Result<Current876Session>> {
  try {
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

/**
 * Returns every account signed in on this device, with the active one flagged.
 *
 * Reads the multi-account set from the session cookie so the account chooser
 * can list all signed-in accounts (Google-style) and offer instant switching.
 * Falls back to a single-entry list for legacy single-account cookies.
 */
export async function getSignedInAccounts(): Promise<
  Array<Session876Account & { active: boolean }>
> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return []

  const session = await verifySession876(cookie.value)
  if (!session?.userId) return []

  const activeSid = session.sid
  const accounts =
    session.accounts && session.accounts.length > 0
      ? session.accounts
      : // Legacy single-account cookie (no `accounts` array yet).
        [
          {
            userId: session.userId,
            email: session.email ?? '',
            firstName: session.firstName,
            lastName: session.lastName,
            emailVerified: session.emailVerified,
            avatar: session.avatar,
            username: session.username,
            sid: session.sid ?? '',
          },
        ]

  return accounts.map((account) => ({
    ...account,
    active: activeSid
      ? account.sid === activeSid
      : account.userId === session.userId,
  }))
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
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  )
}
