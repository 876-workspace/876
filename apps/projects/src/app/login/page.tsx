import {
  AUTH_CALLBACK_ERROR_PARAM,
  resolveAuthCallbackMessage,
} from '@876/core/auth/callback-error'
import { resolveRelativeReturnTo } from '@876/core/auth/return-to'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { isAccountUsable } from '@/lib/auth/account-validity'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from './_components/embedded-auth'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string | string[]
    return_to?: string
    [AUTH_CALLBACK_ERROR_PARAM]?: string | string[]
  }>
}) {
  const params = await searchParams
  const rawReturnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : (params.returnTo ?? params.return_to)
  const returnTo = resolveRelativeReturnTo(rawReturnTo, '/')
  const authError = resolveAuthCallbackMessage(
    params[AUTH_CALLBACK_ERROR_PARAM]
  )

  const session = await getAuthSession()
  if (isSignedSession(session) && (await isAccountUsable(session.user.id)))
    redirect(returnTo)

  return <EmbeddedAuth returnTo={returnTo} authError={authError} />
}
