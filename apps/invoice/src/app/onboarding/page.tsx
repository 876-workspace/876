import { redirect } from 'next/navigation'

import { getInvoiceContextResult } from '@/lib/auth/context'

import { OnboardingForm } from './_components/onboarding-form'

export default async function OnboardingPage() {
  const result = await getInvoiceContextResult()

  if (result.status === 'signed-out') redirect('/login?returnTo=%2Fonboarding')

  // The platform lookup failed. Offering to create an organization here would
  // ask an established account to make a second one, so say what is true.
  if (result.status === 'unavailable')
    return (
      <div className="space-y-2">
        <h1 className="876-page-title">Setup is unavailable</h1>
        <p className="text-muted-foreground text-sm">
          We could not reach 876 to check your organization. Please try again
          shortly.
        </p>
      </div>
    )

  if (result.status === 'ok') {
    const { accessStatus, orgName, role } = result.context
    if (accessStatus === 'active' || accessStatus === 'trialing') redirect('/')

    // The organization exists — including one already using 876 Billing — but
    // has no Invoice subscription. An owner or admin can simply turn it on;
    // anyone else genuinely has to ask them.
    if (accessStatus === 'blocked' || (role !== 'owner' && role !== 'admin'))
      redirect('/no-access?reason=subscription')

    return <OnboardingForm existingOrgName={orgName} />
  }

  return <OnboardingForm />
}
