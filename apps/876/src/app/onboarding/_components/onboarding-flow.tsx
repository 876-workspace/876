'use client'

import { useMemo } from 'react'

import { create876AccountClient } from '@876/account'
import { AuthFlow, AuthPageShell, AuthProvider } from '@876/ui/auth'

/**
 * Business onboarding — new organization creation plus the owner account. Served
 * at `/onboarding` for business customers. Renders the shared {@link AuthFlow}
 * in `business-onboarding` mode (collect org details, then the owner account)
 * against the Python API. On success the new owner lands in their org workspace.
 */
export function BusinessOnboardingFlow() {
  const account = useMemo(
    () =>
      create876AccountClient({
        baseUrl: '/api',
      }),
    []
  )

  return (
    <AuthPageShell>
      <AuthProvider
        config={{
          mode: 'business-onboarding',
          client: account.auth,
          onSuccess: () => {
            window.location.assign('/org')
          },
        }}
      >
        <AuthFlow />
      </AuthProvider>
    </AuthPageShell>
  )
}
