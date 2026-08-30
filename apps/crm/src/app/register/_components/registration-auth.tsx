'use client'

import { create876AccountClient } from '@876/account'
import { AppLogo, AuthFlow, AuthFooterLink, AuthPageShell, AuthProvider, type SocialProvider } from '@876/ui/auth'
import Link from 'next/link'

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'microsoft', 'apple']
const authClient = create876AccountClient({ baseUrl: '/api' })

export function RegistrationAuth() {
  return (
    <AuthPageShell hideBrandMark>
      <AuthProvider
        config={{
          mode: 'business-onboarding',
          client: authClient.auth,
          appName: '876 CRM',
          appLogo: <AppLogo name="876 CRM" />,
          socialProviders: SOCIAL_PROVIDERS,
          onSuccess: () => { window.location.assign('/auth/complete?returnTo=/onboarding') },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>
      <AuthFooterLink>
        Already have a workspace?{' '}
        <Link href="/login" prefetch={false} className="auth-link auth-link-primary">Sign in</Link>
      </AuthFooterLink>
    </AuthPageShell>
  )
}
