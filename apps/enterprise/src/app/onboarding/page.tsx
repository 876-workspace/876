import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

import {
  findAuthRoutingUser,
  requireSession,
  resolvePrimaryOrganizationPath,
} from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Workspace Onboarding | 876',
  robots: { index: false, follow: false },
}

export default async function OrganizationOnboardingPage() {
  const sessionUser = await requireSession('/onboarding')
  const user = await findAuthRoutingUser(sessionUser.id)

  if (!user) redirect('/app')

  const primaryOrganizationPath = await resolvePrimaryOrganizationPath(user.id)
  if (primaryOrganizationPath) redirect(primaryOrganizationPath)

  redirect('/register')
}
