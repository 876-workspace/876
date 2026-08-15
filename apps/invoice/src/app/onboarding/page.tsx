import { redirect } from 'next/navigation'

import { getInvoiceContext } from '@/lib/auth/context'

import { OnboardingForm } from './_components/onboarding-form'

export default async function OnboardingPage() {
  const context = await getInvoiceContext()

  // Already entitled — nothing to set up.
  if (
    context &&
    (context.accessStatus === 'active' || context.accessStatus === 'trialing')
  )
    redirect('/')

  // An organization exists but Invoice is not entitled for it. That is an
  // authorization answer, not a setup step, so it belongs on /no-access.
  if (context) redirect('/no-access?reason=subscription')

  return <OnboardingForm />
}
