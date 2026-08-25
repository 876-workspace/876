import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCrmContextResult } from '@/lib/auth/context'

import { RegistrationAuth } from './_components/registration-auth'

export const metadata: Metadata = {
  title: 'Create workspace',
  robots: { index: false, follow: false },
}

export default async function RegisterPage() {
  const result = await getCrmContextResult()
  if (result.status === 'ok' && (result.context.accessStatus === 'active' || result.context.accessStatus === 'trialing'))
    redirect('/')

  return <RegistrationAuth />
}
