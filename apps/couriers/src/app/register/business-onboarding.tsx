'use client'

import Link from 'next/link'

import {
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
} from '@876/ui/auth'

import { APP_NAME } from '@/lib/app-name'
import { authClient } from '@/lib/auth/client'

export function BusinessOnboarding() {
  return (
    <AuthPageShell layout="split">
      <AuthProvider
        config={{
          mode: 'business-onboarding',
          client: authClient.auth,
          appName: APP_NAME,
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
