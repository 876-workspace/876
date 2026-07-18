import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { resolveRelativeReturnTo } from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from './embedded-auth'

export const metadata: Metadata = {
  title: 'Login',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const params = await searchParams
  const rawReturnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo
  const returnTo = resolveRelativeReturnTo(rawReturnTo, '/')
  const session = await getAuthSession()
  if (isSignedSession(session)) redirect(returnTo)

  return <EmbeddedAuth returnTo={returnTo} />
}
