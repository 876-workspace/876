import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=/onboarding`)

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
