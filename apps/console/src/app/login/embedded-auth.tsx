'use client'

import { useEffect } from 'react'

import {
  AppLogo,
  AuthFlow,
  AuthPageShell,
  AuthProvider,
  type SocialProvider,
} from '@876/ui/auth'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { create876Client } from '@876/sdk'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple', 'microsoft']

/** Auth-bridge client — calls hit this app's own `/api/auth` routes. */
const authClient = create876Client({ baseUrl: '/api' })

/**
 * Embedded Console auth, built on the shared `@876/ui/auth` flow in
 * `enterprise` mode (invite-only: no self-service sign up, password sign-in,
 * password recovery). The admin console authenticates directly against the
 * FastAPI core through its own `/api/auth` bridge — no redirect to a central
 * auth app.
 *
 * Console access itself is still enforced server-side on every request
 * (`requireConsoleAccount` / permission checks): a valid 876 session
 * without admin permissions lands on the access-denied screen, not the console.
 *
 * Social providers return to this app's own `/callback` (the API derives the
 * WorkOS `redirect_uri` from this origin). We seed the return-to cookie on
 * mount so the round-trip lands on the right page. On password/OTP success we
 * hard-navigate to `/auth/complete`, which reads the cookie and redirects in.
 */
export function EmbeddedAuth({
  returnTo,
  logoUrl,
}: {
  returnTo: string
  /** Console's `apps.logo_url` from the DB; null falls back to initials. */
  logoUrl?: string | null
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
          // Per-app branding sourced from the DB (`apps.logo_url`); renders the
          // "MC" initials fallback until a logo image is set on the app record.
          appLogo: <AppLogo name="Console" src={logoUrl} />,
          socialProviders: SOCIAL_PROVIDERS,
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
