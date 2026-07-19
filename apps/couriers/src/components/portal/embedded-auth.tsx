'use client'

import {
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
} from '@876/ui/auth'
import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { authClient } from '@/lib/auth/client'

export function PortalEmbeddedAuth({
  tenantName,
  returnTo,
  enrollmentError,
}: {
  tenantName: string
  returnTo: string
  enrollmentError: boolean
}) {
  return (
    <AuthPageShell layout="center">
      {enrollmentError ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm"
        >
          We couldn&apos;t set up your portal account. Please sign in again.
        </div>
      ) : null}

      <AuthProvider
        config={{
          mode: 'consumer',
          client: authClient.auth,
          appName: tenantName,
          socialProviders: [],
          onSuccess: () => {
            const searchParams = new URLSearchParams({
              [AUTH_RETURN_TO_PARAM]: returnTo,
            })
            window.location.assign(
              `/portal/auth/complete?${searchParams.toString()}`
            )
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>

      <AuthFooterLink>
        New here? Enter your email to create an account.
      </AuthFooterLink>
    </AuthPageShell>
  )
}
