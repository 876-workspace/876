import { redirect } from 'next/navigation'

import { getCommerceContextResult } from '@/lib/auth/context'

import { OnboardingForm } from './_components/onboarding-form'

export default async function OnboardingPage() {
  const result = await getCommerceContextResult()
  if (result.status === 'signed-out') redirect('/login?returnTo=%2Fonboarding')
  if (result.status === 'wrong-account') redirect('/wrong-account')
  if (result.status === 'unavailable') redirect('/unavailable')
  if (result.status === 'no-organization') return <OnboardingForm />

  if (result.accessStatus === 'active' || result.accessStatus === 'trialing')
    redirect('/')
  if (result.accessStatus === 'blocked' || !result.isAdmin)
    redirect('/no-access?reason=subscription')

  return <OnboardingForm existingOrgName={result.organizationName} />
}
