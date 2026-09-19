import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'
import { BudgetForm } from './budget-form'

export async function EditBudgetData({
  orgId,
  projectId,
  budgetId,
}: {
  orgId: string
  projectId: string
  budgetId: string
}) {
  const decodedProject = decodeURIComponent(projectId)
  const [budgetResult, billingResult] = await Promise.all([
    projects.budgets.retrieve(
      orgId,
      decodedProject,
      decodeURIComponent(budgetId)
    ),
    projects.projectBilling.retrieve(orgId, decodedProject),
  ])

  if (budgetResult.error?.code === 'projects/budget-not-found') notFound()
  if (budgetResult.error || !budgetResult.data)
    return (
      <AppError
        title="The budget could not be loaded"
        error={
          budgetResult.error ?? {
            code: 'projects/budget-unavailable',
            message: 'The budget could not be loaded.',
          }
        }
        variant="banner"
      />
    )

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
        mode="edit"
        projectId={decodedProject}
        budget={budgetResult.data}
        currency={billingResult.data?.currency ?? 'USD'}
      />
    </div>
  )
}
