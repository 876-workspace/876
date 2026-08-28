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

import { isAccountUsable } from '@/lib/auth/account-validity'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from './_components/embedded-auth'

export const metadata: Metadata = {
  title: 'Organization Login',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function OrgLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    [AUTH_CALLBACK_ERROR_PARAM]?: string | string[]
    returnTo?: string | string[]
  }>
}) {
  const params = await searchParams
  const returnTo = resolveReturnTo(
    firstSearchParam(params[AUTH_RETURN_TO_PARAM])
  )
  const authError = resolveAuthCallbackMessage(
    params[AUTH_CALLBACK_ERROR_PARAM]
  )

  const result = await getAuthSession()
  if (isSignedSession(result) && (await isAccountUsable(result.user.id))) {
    if (result.user.realm !== 'enterprise' && !result.user.crossRealm)
      redirect('/access-denied')
    redirect(returnTo)
  }

  return <EmbeddedAuth returnTo={returnTo} authError={authError} />
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function resolveReturnTo(value: string): string {
  const returnTo = resolveRelativeReturnTo(value, '/')
  if (returnTo === '/login' || returnTo.startsWith('/login?')) return '/'
  return returnTo
}
