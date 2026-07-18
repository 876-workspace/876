import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()

  if (!isSignedSession(session))
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=/onboarding`)

  return <div className="bg-background min-h-screen">{children}</div>
}
