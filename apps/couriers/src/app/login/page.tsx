import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { APP_NAME } from '@/lib/app-name'
import { getManageContext } from '@/lib/auth/manage-context'

import { AppEmbeddedAuth } from './embedded-auth'

export const metadata: Metadata = {
  title: `Sign in | ${APP_NAME}`,
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const returnTo = resolveRelativeReturnTo(
    firstParam(params[AUTH_RETURN_TO_PARAM]),
    '/'
  )

  const ctx = await getManageContext()
  if (ctx) redirect(returnTo)

  return <AppEmbeddedAuth returnTo={returnTo} />
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
