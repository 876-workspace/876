import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getProjectsContextResult } from '@/lib/auth/context'

import { RegistrationAuth } from './_components/registration-auth'

export const metadata: Metadata = {
  title: 'Create workspace',
  robots: { index: false, follow: false },
}

export default async function RegisterPage() {
  const result = await getProjectsContextResult()

  if (result.status === 'unavailable') redirect('/unavailable')
  if (result.status === 'no-organization') redirect('/onboarding')

  if (result.status === 'ok') {
    if (
      result.context.accessStatus === 'active' ||
      result.context.accessStatus === 'trialing'
    )
      redirect('/')

    redirect('/onboarding')
  }

  return <RegistrationAuth />
}
