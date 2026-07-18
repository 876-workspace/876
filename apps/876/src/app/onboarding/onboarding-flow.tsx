'use client'

import { useMemo } from 'react'

import { create876Client } from '@876/sdk'
import { AuthFlow, AuthPageShell, AuthProvider } from '@876/ui/auth'

/**
 * Business onboarding — new organization creation plus the owner account. Served
 * at `/onboarding` for business customers. Renders the shared {@link AuthFlow}
 * in `business-onboarding` mode (collect org details, then the owner account)
 * against the Python API. On success the new owner lands in their org workspace.
 */
export function BusinessOnboardingFlow() {
  const $876 = useMemo(
    () =>
      create876Client({
        baseUrl: '/api',
      }),
    []
  )

  return (
    <AuthPageShell>
      <AuthProvider
        config={{
          mode: 'business-onboarding',
          client: $876.auth,
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
