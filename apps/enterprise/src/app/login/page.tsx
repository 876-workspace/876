import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from './embedded-auth'

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
    authError?: string | string[]
    returnTo?: string | string[]
  }>
}) {
  const params = await searchParams
  const returnTo = resolveReturnTo(
    firstSearchParam(params[AUTH_RETURN_TO_PARAM])
  )

  const result = await getAuthSession()
  if (isSignedSession(result)) redirect(returnTo)

  return <EmbeddedAuth returnTo={returnTo} />
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
