import { redirect } from 'next/navigation'

import { PlatformUnavailable } from '@/components/platform-unavailable'
import { getInvoiceContextResult } from '@/lib/auth/context'

import { OnboardingForm } from './_components/onboarding-form'

export default async function OnboardingPage() {
  const result = await getInvoiceContextResult()

  if (result.status === 'signed-out') redirect('/login?returnTo=%2Fonboarding')

  // The platform lookup failed. Offering to create an organization here would
  // ask an established account to make a second one.
  if (result.status === 'unavailable') return <PlatformUnavailable />

  if (result.status === 'ok') {
    const { accessStatus, orgName, role } = result.context
    if (accessStatus === 'active' || accessStatus === 'trialing') redirect('/')

    // The organization exists — including one already using 876 Billing — but
    // has no Invoice subscription. A super admin or admin can simply turn it
    // on; anyone else genuinely has to ask them.
    if (accessStatus === 'blocked' || (role !== 'super-admin' && role !== 'admin'))
      redirect('/no-access?reason=subscription')

    return <OnboardingForm existingOrgName={orgName} />
  }

  return <OnboardingForm />
}
