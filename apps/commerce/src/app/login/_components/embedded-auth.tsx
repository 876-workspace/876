'use client'

import { create876AccountClient } from '@876/account'
import {
  AppLogo,
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
  type SocialProvider,
} from '@876/ui/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const client = create876AccountClient({ baseUrl: '/api' })
const socialProviders: SocialProvider[] = ['google', 'microsoft', 'apple']

export function EmbeddedAuth({ returnTo }: { returnTo: string }) {
  const router = useRouter()

  return (
    <AuthPageShell hideBrandMark>
      <AuthProvider
        config={{
          mode: 'enterprise',
          client: client.auth,
          appName: '876 Commerce',
          appLogo: <AppLogo name="876 Commerce" />,
          socialProviders,
          onSuccess: () => router.push(returnTo),
        }}
      >
        <AuthFlow />
      </AuthProvider>
      <AuthFooterLink>
        New to 876 Commerce?{' '}
        <Link href="/register" className="auth-link auth-link-primary">
          Create a workspace
        </Link>
      </AuthFooterLink>
    </AuthPageShell>
  )
}
