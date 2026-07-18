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
        crossRealm: session.crossRealm,
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

export function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  )
}
