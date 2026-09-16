import { BillingConfigSummary } from '@876/projects-ui/finance/billing-config-summary'
import { BudgetList } from '@876/projects-ui/finance/budget-list'
import { FinancialSummaryPanel } from '@876/projects-ui/finance/financial-summary-panel'
import { RateList } from '@876/projects-ui/finance/rate-list'
import { AppError } from '@876/ui/app-error'

import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import type { FinancePeriod } from '../period'
import { InvoiceDraftAction } from './invoice-draft-action'

export async function FinanceData({
  projectId,
  period,
}: {
  projectId: string
  period: FinancePeriod
}) {
  const { orgId, userId } = await requireProjectsContext()
  const decoded = decodeURIComponent(projectId)
  const [billingResult, summaryResult, budgetsResult, ratesResult, access] =
    await Promise.all([
      projects.projectBilling.retrieve(orgId, decoded),
      projects.projectBilling.financialSummary(orgId, decoded, period),
      projects.budgets.list(orgId, decoded),
      projects.rates.list(orgId, decoded),
      resolveAccessContext(userId, orgId),
    ])

  if (billingResult.error || !billingResult.data)
    return (
      <AppError
        title="Billing settings could not be loaded"
        error={
          billingResult.error ?? {
            code: 'projects/billing-unavailable',
            message: 'Billing settings could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const billing = billingResult.data
  const canEdit =
    access.status === 'ok' && canAccess(access.context, 'projects.edit')
  const canInvoice =
    canEdit &&
    billing.billingMethod !== 'non-billable' &&
    billing.billingCustomerId !== null
  const base = `/projects/${encodeURIComponent(projectId)}/finance`

  return (
    <div className="space-y-4">
      {summaryResult.error ?? budgetsResult.error ?? ratesResult.error ? (
        <AppError
          title="Some finance data could not be loaded"
          error={
            (summaryResult.error ??
              budgetsResult.error ??
              ratesResult.error) as { code: string; message: string }
          }
          variant="banner"
        />
      ) : null}
      <BillingConfigSummary
        billing={billing}
        editHref={`${base}/billing/edit`}
        canEdit={canEdit}
      />
      {summaryResult.data ? (
        <FinancialSummaryPanel
          summary={summaryResult.data}
          currency={billing.currency}
        />
      ) : null}
      <InvoiceDraftAction
        projectId={decoded}
        from={period.from}
        to={period.to}
        canInvoice={canInvoice}
        unpricedMinutes={summaryResult.data?.unpricedMinutes ?? null}
      />
      <BudgetList
        budgets={budgetsResult.data?.data ?? []}
        currency={billing.currency}
        newHref={`${base}/budgets/new`}
        editBaseHref={`${base}/budgets`}
        canEdit={canEdit}
      />
      <RateList
        rates={ratesResult.data?.data ?? []}
        newHref={`${base}/rates/new`}
        editBaseHref={`${base}/rates`}
        canEdit={canEdit}
      />
    </div>
  )
}
