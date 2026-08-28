'use client'

import { create876Client } from '@876/client'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'
import {
  AppLogo,
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
  type SocialProvider,
} from '@876/ui/auth'
import Link from 'next/link'
import { useEffect } from 'react'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'microsoft', 'apple']
const authClient = create876Client({ baseUrl: '/api' })

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
          appName: '876 CRM',
          appLogo: <AppLogo name="876 CRM" />,
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

      <AuthFooterLink>
        New to 876 CRM?{' '}
        <Link
          href="/register"
          prefetch={false}
          className="auth-link auth-link-primary"
        >
          Create a workspace
        </Link>
      </AuthFooterLink>
    </AuthPageShell>
  )
}
