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
  AUTH_RETURN_TO_PARAM,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { authClient } from '@/lib/auth/client'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple', 'microsoft']

/**
 * Embedded consumer auth, built on the shared `@876/ui/auth` progressive flow.
 *
 * This is the embedded-auth pivot: instead of redirecting the browser to a
 * centralized auth app, the consumer app hosts the entire email-first
 * experience itself and talks to the FastAPI core through its own `/api/auth`
 * bridge (`authClient` is configured with `baseUrl: '/api'`). The API
 * seals the session and sets the cookie on this app's own origin.
 *
 * The package owns presentation + flow; the host owns the session-adjacent
 * concerns it deliberately stays out of:
 *
 * - seed the return-to cookie on mount so a later social login (which leaves
 *   the origin via `window.location.assign`) can recover the intended
 *   destination after the WorkOS round-trip lands back on `/callback`;
 * - on success, hard-navigate to `/auth/complete` (a Route Handler that reads
 *   the freshly set session cookie and issues the final server redirect);
 * - email-verification challenges are handled in-card (we return `false` from
 *   `onEmailVerificationRequired`) so there is no extra page to host.
 *
 * Social providers return to this app's own `/callback` (the API derives the
 * WorkOS `redirect_uri` from this origin), so the session cookie lands on the
 * right origin with no cross-origin handoff.
 */
export function EmbeddedAuth({
  returnTo,
  intent,
}: {
  returnTo: string
  intent: 'sign-in' | 'sign-up'
}) {
  // Seed the return-to cookie once on mount so a later social login can recover
  // the intended destination after the OAuth round-trip.
  useEffect(() => {
    writeReturnToCookie(returnTo)
  }, [returnTo])

  return (
    <AuthPageShell>
      <AuthProvider
        config={{
          mode: 'consumer',
          client: authClient.auth,
          appName: '876',
          socialProviders: SOCIAL_PROVIDERS,
          onSuccess: () => {
            // Hard navigation: /auth/complete reads the session cookie and
            // issues a server redirect, then the destination re-hydrates the
            // client user store from the server session.
            window.location.assign(getAuthCompleteHref(returnTo))
          },
          // Handle email-verification in-card (no dedicated page to host).
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>

      {intent === 'sign-in' ? (
        <AuthFooterLink>
          Don&apos;t have an account?{' '}
          <Link
            href={withReturnTo('/register', returnTo)}
            prefetch={false}
            className="auth-link auth-link-primary"
          >
            Create one
          </Link>
        </AuthFooterLink>
      ) : (
        <AuthFooterLink>
          Already have an account?{' '}
          <Link
            href={withReturnTo('/login', returnTo)}
            prefetch={false}
            className="auth-link auth-link-primary"
          >
            Sign in
          </Link>
        </AuthFooterLink>
      )}
    </AuthPageShell>
  )
}

function getAuthCompleteHref(returnTo: string): string {
  return withReturnTo('/auth/complete', returnTo)
}

function withReturnTo(path: string, returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `${path}?${searchParams.toString()}`
}

function writeReturnToCookie(returnTo: string): void {
  const value = encodeURIComponent(resolveRelativeReturnTo(returnTo, '/app'))
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_RETURN_TO_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax${secure}`
}
