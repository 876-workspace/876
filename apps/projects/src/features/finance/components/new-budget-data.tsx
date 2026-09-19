import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/clients/projects'
import { BudgetForm } from './budget-form'

export async function NewBudgetData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const decoded = decodeURIComponent(projectId)
  const billingResult = await projects.projectBilling.retrieve(orgId, decoded)

  return (
    <div className="space-y-4">
      {billingResult.error ? (
        <AppError
          title="Some budget form data could not be loaded"
          error={billingResult.error}
          variant="banner"
        />
      ) : null}
      <BudgetForm
        mode="create"
        projectId={decoded}
        currency={billingResult.data?.currency ?? 'USD'}
      />
    </div>
  )
}
