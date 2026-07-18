import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { $876 } from '@/lib/876'
import { CONSOLE_APP_SLUG } from '@/lib/console-app'

import { EmbeddedAuth } from './embedded-auth'

export const metadata: Metadata = {
  title: 'Login',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ConsoleLoginPage({
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

  const logoUrl = await getConsoleLogoUrl()

  return <EmbeddedAuth returnTo={returnTo} logoUrl={logoUrl} />
}

/**
 * Console's own logo, sourced from its app record (`apps.logo_url`).
 * Server-side admin lookup; failures degrade gracefully to the initials
 * fallback so the login page never breaks on a branding fetch.
 */
async function getConsoleLogoUrl(): Promise<string | null> {
  try {
    const { data } = await $876.apps.list({ appKind: 'internal', limit: 100 })
    const app = data?.data.find((entry) => entry.slug === CONSOLE_APP_SLUG)
    return app?.logo_url ?? null
  } catch {
    return null
  }
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
