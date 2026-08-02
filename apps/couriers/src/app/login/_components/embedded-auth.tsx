'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import {
  AuthFlow,
  AuthFooterLink,
  AuthPageShell,
  AuthProvider,
} from '@876/ui/auth'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { APP_NAME } from '@/lib/app-name'
import { manageAuthClient } from '@/lib/auth/client'

export function AppEmbeddedAuth({ returnTo }: { returnTo: string }) {
  useEffect(() => {
    writeReturnToCookie(returnTo)
  }, [returnTo])

  return (
    <AuthPageShell layout="split">
      <AuthProvider
        config={{
          mode: 'enterprise',
          client: manageAuthClient.auth,
          appName: APP_NAME,
          socialProviders: ['google', 'apple', 'microsoft'],
          onSuccess: () => {
            window.location.assign(getAuthCompleteHref(returnTo))
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>

      <AuthFooterLink>
        New to {APP_NAME}?{' '}
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

function getAuthCompleteHref(returnTo: string): string {
  const searchParams = new URLSearchParams({ returnTo })
  return `/auth/complete?${searchParams.toString()}`
}

function writeReturnToCookie(returnTo: string): void {
  const value = encodeURIComponent(resolveRelativeReturnTo(returnTo, '/'))
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_RETURN_TO_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax${secure}`
}
