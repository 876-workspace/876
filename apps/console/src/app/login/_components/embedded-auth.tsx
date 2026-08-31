'use client'

import { create876AccountClient } from '@876/account'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import {
  AppLogo,
  AuthFlow,
  AuthPageShell,
  AuthProvider,
  type SocialProvider,
} from '@876/ui/auth'
import { useEffect } from 'react'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple', 'microsoft']

/** Auth-bridge client — calls hit this app's own `/api/auth` routes. */
const authClient = create876AccountClient({ baseUrl: '/api' })

export function EmbeddedAuth({
  returnTo,
  logoUrl,
  authError,
}: {
  returnTo: string
  /** Console's `apps.logo_url` from the DB; null falls back to initials. */
  logoUrl?: string | null
  authError?: string | null
}) {
  useEffect(() => {
    writeReturnToCookie(returnTo)
  }, [returnTo])

  return (
    <AuthPageShell hideBrandMark>
      <AuthProvider
        config={{
          mode: 'enterprise',
          client: authClient.auth,
          appName: 'Console',
          appLogo: <AppLogo name="Console" src={logoUrl} />,
          socialProviders: SOCIAL_PROVIDERS,
          initialNotice: authError
            ? { type: 'error', message: authError }
            : undefined,
          onSuccess: () => {
            window.location.assign(getAuthCompleteHref(returnTo))
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>
    </AuthPageShell>
  )
}

function getAuthCompleteHref(returnTo: string): string {
  const searchParams = new URLSearchParams({ returnTo })
  return `/auth/complete?${searchParams.toString()}`
}

function writeReturnToCookie(returnTo: string): void {
  const value = encodeURIComponent(resolveRelativeReturnTo(returnTo, '/'))
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_RETURN_TO_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax${secure}`
}
