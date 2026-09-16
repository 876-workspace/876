import { AppError } from '@876/ui/app-error'
import { BillingConfigSummary } from '@876/projects-ui/finance/billing-config-summary'
import { BudgetList } from '@876/projects-ui/finance/budget-list'
import { FinancialSummaryPanel } from '@876/projects-ui/finance/financial-summary-panel'
import { RateList } from '@876/projects-ui/finance/rate-list'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

/**
 * The data half of the project Finance tab, shared by every host: billing
 * configuration, period summary, budgets, and rates. Read-only, so every
 * shared list renders with editing disabled.
 */
export async function ProjectFinanceData({
  organizationId,
  base,
  projectId,
  from,
  to,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
  from: number
  to: number
}) {
  const [billingResult, summaryResult, budgetsResult, ratesResult] =
    await Promise.all([
      projects.projectBilling.retrieve(organizationId, projectId),
      projects.projectBilling.financialSummary(organizationId, projectId, {
        from,
        to,
      }),
      projects.budgets.list(organizationId, projectId),
      projects.rates.list(organizationId, projectId),
    ])

  if (billingResult.error?.code === 'projects/project-not-found') notFound()

  if (billingResult.error || !billingResult.data) {
    return (
      <AppError
        title="Billing settings could not be loaded"
        error={billingResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const billing = billingResult.data
  const loadError =
    summaryResult.error ?? budgetsResult.error ?? ratesResult.error
  const financeBase = `${base}/projects/${encodeURIComponent(projectId)}/finance`

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some finance data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <BillingConfigSummary
        billing={billing}
        editHref={financeBase}
        canEdit={false}
      />
      {summaryResult.data ? (
        <FinancialSummaryPanel
          summary={summaryResult.data}
          currency={billing.currency}
        />
      ) : null}
      <BudgetList
        budgets={budgetsResult.data?.data ?? []}
        currency={billing.currency}
        newHref={financeBase}
        editBaseHref={financeBase}
        canEdit={false}
      />
      <RateList
        rates={ratesResult.data?.data ?? []}
        newHref={financeBase}
        editBaseHref={financeBase}
        canEdit={false}
      />
    </div>
  )
}
