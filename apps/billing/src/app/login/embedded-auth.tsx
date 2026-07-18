'use client'

import { useEffect } from 'react'

import {
  AppLogo,
  AuthFlow,
  AuthPageShell,
  AuthProvider,
  type SocialProvider,
} from '@876/ui/auth'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import { create876Client } from '@876/sdk'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple', 'microsoft']
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
          appName: '876 Billing',
          appLogo: <AppLogo name="876 Billing" />,
          socialProviders: SOCIAL_PROVIDERS,
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
