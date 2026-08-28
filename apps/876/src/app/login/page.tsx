import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_CALLBACK_ERROR_PARAM,
  resolveAuthCallbackMessage,
} from '@876/core/auth/callback-error'
import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from '@/features/auth/components/embedded-auth'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your 876 account to continue.',
  robots: {
    index: false,
    follow: true,
  },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string | string[]
    [AUTH_CALLBACK_ERROR_PARAM]?: string | string[]
  }>
}) {
  const params = await searchParams
  const returnTo = resolveRelativeReturnTo(
    firstSearchParam(params[AUTH_RETURN_TO_PARAM]),
    '/app'
  )
  const authError = resolveAuthCallbackMessage(
    params[AUTH_CALLBACK_ERROR_PARAM]
  )

  const result = await getAuthSession()
  if (isSignedSession(result)) redirect(returnTo)

  return (
    <EmbeddedAuth returnTo={returnTo} intent="sign-in" authError={authError} />
  )
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
