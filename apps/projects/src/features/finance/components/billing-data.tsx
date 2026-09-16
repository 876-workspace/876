import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/services/projects'
import { BillingForm } from './billing-form'

export async function BillingData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const decoded = decodeURIComponent(projectId)
  const billingResult = await projects.projectBilling.retrieve(orgId, decoded)

  if (
    billingResult.error &&
    billingResult.error.code !== 'projects/billing-not-found' &&
    billingResult.error.code !== 'projects/project-billing-not-found'
  )
    return (
      <AppError
        title="Billing settings could not be loaded"
        error={billingResult.error}
        variant="banner"
      />
    )

  return (
    <div className="space-y-4">
      {billingResult.error ? (
        <AppError
          title="No billing configuration was found"
          error={billingResult.error}
          variant="banner"
        />
      ) : null}
      <BillingForm projectId={decoded} billing={billingResult.data ?? null} />
    </div>
  )
}
