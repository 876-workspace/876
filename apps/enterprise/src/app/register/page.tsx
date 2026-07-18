import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { BusinessOnboarding } from './business-onboarding'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create your workspace',
  description: 'Set up your business and organization on 876.',
  robots: {
    index: false,
    follow: true,
  },
}

export default async function RegisterPage() {
  const result = await getAuthSession()
  if (isSignedSession(result)) redirect('/')

  return <BusinessOnboarding />
}
