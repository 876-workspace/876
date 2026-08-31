'use client'

import { create876AccountClient } from '@876/account'
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

const authClient = create876AccountClient({ baseUrl: '/api' })

export function EmbeddedAuth({
  returnTo,
  authError,
}: {
  returnTo: string
  authError?: string | null
}) {
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
          initialNotice: authError
            ? { type: 'error', message: authError }
            : undefined,
          onSuccess: () => {
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
