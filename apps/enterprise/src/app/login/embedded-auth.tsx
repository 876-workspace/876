'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import {
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
  type SocialProvider,
} from '@876/ui/auth'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { $876 } from '@/lib/876'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'microsoft']

/**
 * Embedded org-workspace sign-in, built on the shared `@876/ui/auth` flow in
 * `enterprise` mode (existing members: password sign-in + recovery, no
 * self-service account creation here). The org app authenticates directly
 * against the FastAPI core through its own `/api/auth` bridge — no redirect to
 * a central auth app.
 *
 * New businesses self-onboard at `/register` (business-onboarding mode), which
 * creates the owner account, the organization, and the owner membership.
 *
 * Social providers return to this app's own `/callback` (the API derives the
 * WorkOS `redirect_uri` from this origin). We seed the return-to cookie on
 * mount so the round-trip lands on the right page. On password/OTP success we
 * hard-navigate to `/auth/complete`, which reads the cookie and redirects in.
 */
export function EmbeddedAuth({ returnTo }: { returnTo: string }) {
  useEffect(() => {
    writeReturnToCookie(returnTo)
  }, [returnTo])

  return (
    <AuthPageShell>
      <AuthProvider
        config={{
          mode: 'enterprise',
          client: $876.auth,
          appName: '876 Enterprise',
          socialProviders: SOCIAL_PROVIDERS,
          onSuccess: () => {
            window.location.assign(getAuthCompleteHref(returnTo))
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>

      <AuthFooterLink>
        Need to create a workspace?{' '}
        <Link
          href="/register"
          prefetch={false}
          className="auth-link auth-link-primary"
        >
          Set up your business
        </Link>
      </AuthFooterLink>
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
