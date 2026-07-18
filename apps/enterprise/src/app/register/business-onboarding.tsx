'use client'

import Link from 'next/link'

import {
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
} from '@876/ui/auth'

import { $876 } from '@/lib/876'

/**
 * Business onboarding — new organization creation plus the owner account.
 *
 * Renders the shared {@link AuthFlow} in `business-onboarding` mode (collect
 * company details, then the owner account) against the FastAPI core through the
 * org app's own `/api/auth` bridge. On success the API has created the owner
 * account, the organization, and the owner membership; the session cookie is
 * set on this origin and the new owner lands in their workspace.
 */
export function BusinessOnboarding() {
  return (
    <AuthPageShell>
      <AuthProvider
        config={{
          mode: 'business-onboarding',
          client: $876.auth,
          onSuccess: () => {
            window.location.assign('/auth/complete?returnTo=/')
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>

      <AuthFooterLink>
        Already have a workspace?{' '}
        <Link
          href="/login"
          prefetch={false}
          className="auth-link auth-link-primary"
        >
          Sign in
        </Link>
      </AuthFooterLink>
    </AuthPageShell>
  )
}
