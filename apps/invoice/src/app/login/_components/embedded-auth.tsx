'use client'

import { create876Client } from '@876/client'
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

/**
 * Google, Outlook (Microsoft), and Apple — the three 876 offers. `microsoft`
 * is the provider key WorkOS and `PROVIDER_ICONS` use for Outlook accounts.
 */
const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'microsoft', 'apple']

const authClient = create876Client({ baseUrl: '/api' })

export function EmbeddedAuth({ returnTo }: { returnTo: string }) {
  useEffect(() => {
    const value = encodeURIComponent(resolveRelativeReturnTo(returnTo, '/'))
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${AUTH_RETURN_TO_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax${secure}`
  }, [returnTo])

  return (
    <AuthPageShell hideBrandMark>
      <AuthProvider
        config={{
          mode: 'enterprise',
          client: authClient.auth,
          appName: '876 Invoice',
          appLogo: <AppLogo name="876 Invoice" />,
          socialProviders: SOCIAL_PROVIDERS,
          onSuccess: () => {
            // A full document load, not router.push: the API has just set the
            // session cookie on this origin, and only a fresh request carries
            // it to the server components that resolve the organization.
            window.location.assign(
              `/auth/complete?returnTo=${encodeURIComponent(returnTo)}`
            )
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>
    </AuthPageShell>
  )
}
