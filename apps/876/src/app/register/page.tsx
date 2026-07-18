import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from '../login/embedded-auth'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create your 876 account to get started.',
  robots: {
    index: false,
    follow: true,
  },
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const params = await searchParams
  const returnTo = resolveRelativeReturnTo(
    firstSearchParam(params[AUTH_RETURN_TO_PARAM]),
    '/app'
  )

  const result = await getAuthSession()
  if (isSignedSession(result)) redirect(returnTo)

  return <EmbeddedAuth returnTo={returnTo} intent="sign-up" />
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
