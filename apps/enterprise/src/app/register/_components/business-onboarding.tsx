'use client'

import Link from 'next/link'

import {
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
} from '@876/ui/auth'

import { account } from '@/lib/services/account'

/**
 * Business onboarding — new organization creation plus the organization creator account.
 *
 * Renders the shared {@link AuthFlow} in `business-onboarding` mode (collect
 * company details, then the organization creator account) against the FastAPI core through the
 * org app's own `/api/auth` bridge. On success the API has created the owner
 * account, the organization, and the super-admin membership; the session cookie is
 * set on this origin and the new owner lands in their workspace.
 */
export function BusinessOnboarding() {
  return (
    <AuthPageShell>
      <AuthProvider
        config={{
          mode: 'business-onboarding',
          client: account.auth,
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
