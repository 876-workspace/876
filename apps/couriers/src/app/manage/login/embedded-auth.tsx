'use client'

import { useEffect } from 'react'

import { AuthFlow, AuthPageShell, AuthProvider } from '@876/ui/auth'
import {
  AUTH_RETURN_TO_COOKIE,
  resolveRelativeReturnTo,
} from '@876/core/auth/return-to'

import { APP_NAME } from '@/lib/app-name'
import { manageAuthClient } from '@/lib/auth/client'

export function ManageEmbeddedAuth({ returnTo }: { returnTo: string }) {
  useEffect(() => {
    writeReturnToCookie(returnTo)
  }, [returnTo])

  return (
    <AuthPageShell layout="split">
      <AuthProvider
        config={{
          mode: 'enterprise',
          client: manageAuthClient.auth,
          appName: `${APP_NAME} — Management`,
          onSuccess: () => {
            window.location.assign(getAuthCompleteHref(returnTo))
          },
          onEmailVerificationRequired: () => false,
        }}
      >
        <AuthFlow />
      </AuthProvider>
    </AuthPageShell>
  )
}

function getAuthCompleteHref(returnTo: string): string {
  const searchParams = new URLSearchParams({ returnTo })
  return `/manage/auth/complete?${searchParams.toString()}`
}

function writeReturnToCookie(returnTo: string): void {
  const value = encodeURIComponent(resolveRelativeReturnTo(returnTo, '/manage'))
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_RETURN_TO_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax${secure}`
}
