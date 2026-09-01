import { redirect } from 'next/navigation'

import { getCrmContextResult } from '@/lib/auth/context'

import { OnboardingForm } from './_components/onboarding-form'

export default async function OnboardingPage() {
  const result = await getCrmContextResult()

  if (result.status === 'signed-out') redirect('/login?returnTo=%2Fonboarding')
  if (result.status === 'unavailable') redirect('/unavailable')

  if (result.status === 'ok') {
    const { accessStatus, orgName, role } = result.context
    if (accessStatus === 'active' || accessStatus === 'trialing') redirect('/')

    if (
      accessStatus === 'blocked' ||
      (role !== 'super-admin' && role !== 'admin')
    )
      redirect('/no-access?reason=subscription')

    return <OnboardingForm existingOrgName={orgName} />
  }

  return <OnboardingForm />
}
