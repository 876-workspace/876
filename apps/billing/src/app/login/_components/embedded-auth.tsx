'use client'

import { useEffect } from 'react'

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
import { account } from '@/lib/services/account-browser'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple', 'microsoft']
const authClient = account

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
          appName: '876 Billing',
          appLogo: <AppLogo name="876 Billing" />,
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
