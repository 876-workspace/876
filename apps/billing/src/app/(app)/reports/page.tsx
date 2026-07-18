import { BarChart3 } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Reports',
  description: 'Commercial performance reports grouped by currency.',
}

export default async function ReportsPage() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const overview = await service.dashboard.overview(context.tenant.id)

  return (
    <Page>
      <PageHeader>
        <PageTitle>Reports</PageTitle>
        <PageDescription>
          Commercial reporting is intentionally grouped by currency. No FX
          conversion, tax filing, payment settlement, or revenue recognition is
          implied by these figures.
        </PageDescription>
      </PageHeader>

      <section className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          title="Contracted recurring revenue"
          description="Estimated MRR and annualized recurring value from active and trialing subscriptions."
          values={overview.recurringRevenue.map((metric) => ({
            key: metric.currency,
            primary: `${formatMoney(metric.mrr, metric.currency)} estimated MRR`,
            secondary: `${formatMoney(metric.arr, metric.currency)} ARR`,
          }))}
          emptyTitle="No recurring subscriptions"
          emptyDescription="Create a recurring price and subscription to begin tracking contracted recurring value."
        />
        <ReportCard
          title="Issued invoice value"
          description="Totals from finalized (open, sent, overdue, partially or fully paid) invoices. These are not settlement totals."
          values={overview.issuedInvoiceTotals.map((metric) => ({
            key: metric.currency,
            primary:
              formatMoney(metric.totalOutstanding, metric.currency) +
              ' outstanding',
            secondary: `${formatMoney(metric.totalIssued, metric.currency)} total issued`,
          }))}
          emptyTitle="No finalized invoices"
          emptyDescription="Draft invoices appear in Sales and do not count here until they are finalized."
        />
      </section>
    </Page>
  )
}

function ReportCard({
  title,
  description,
  values,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  values: Array<{ key: string; primary: string; secondary: string }>
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <section className="876-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      {values.length === 0 ? (
        <Empty className="border-0 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.key} className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {value.key}
              </p>
              <p className="mt-2 text-lg font-semibold">{value.primary}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {value.secondary}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
