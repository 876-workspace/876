import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Dashboard',
  description: 'Billing workspace overview.',
}

export default async function DashboardPage() {
  const context = await requirePagePermission('dashboard:read')
  const overview = await service.dashboard.overview(context.tenant.id)

  return (
    <Page className="pb-12">
      <PageHeader className="mb-8">
        <p className="text-brand mb-2 text-xs font-semibold tracking-widest uppercase">
          Workspace Overview
        </p>
        <PageTitle className="text-3xl font-extrabold tracking-tight">
          Dashboard
        </PageTitle>
        <PageDescription className="text-muted-foreground mt-2 text-lg">
          Monitor your commercial performance, active subscriptions, and
          outstanding receivables.
        </PageDescription>
      </PageHeader>

      <div className="grid gap-6">
        {/* Top Metric Row */}
        <section
          aria-label="Key Metrics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            label="Active Customers"
            value={String(overview.customerCount)}
            trend="+New"
            color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <MetricCard
            label="Active Subscriptions"
            value={String(overview.activeSubscriptions)}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <MetricCard
            label="Trials"
            value={String(overview.trialingSubscriptions)}
            color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <MetricCard
            label="Active Products"
            value={String(overview.productCount)}
            color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          />
        </section>

        {/* Revenue and Receivables Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* MRR Section */}
          <section className="876-card group border-border relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="pointer-events-none absolute top-0 right-0 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent p-32 opacity-50" />
            <div className="relative p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight">
                  Recurring Revenue
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Contracted recurring value from active subscriptions.
                  <br />
                  <span className="text-xs italic">
                    (Does not include one-off invoices)
                  </span>
                </p>
              </div>

              {overview.recurringRevenue.length === 0 ? (
                <div className="bg-muted/30 border-border/60 rounded-xl border border-dashed px-6 py-10 text-center">
                  <p className="text-sm font-semibold">
                    No recurring subscriptions
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Create a recurring price and subscription to track MRR.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {overview.recurringRevenue.map((metric) => (
                    <div
                      key={metric.currency}
                      className="bg-background/50 border-border/50 rounded-xl border p-5 shadow-sm backdrop-blur-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                          {metric.currency} MRR
                        </p>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          Active
                        </span>
                      </div>
                      <p className="text-3xl font-extrabold tracking-tighter">
                        {formatMoney(metric.mrr, metric.currency)}
                      </p>
                      <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-3">
                        <p className="text-muted-foreground text-sm font-medium">
                          Annualized (ARR)
                        </p>
                        <p className="text-sm font-semibold">
                          {formatMoney(metric.arr, metric.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Invoices Section */}
          <section className="876-card group border-border relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="pointer-events-none absolute top-0 right-0 bg-gradient-to-bl from-rose-500/10 via-transparent to-transparent p-32 opacity-50" />
            <div className="relative p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight">
                  Outstanding Receivables
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Total value of issued invoices and pending balances.
                </p>
              </div>

              {overview.issuedInvoiceTotals.length === 0 ? (
                <div className="bg-muted/30 border-border/60 rounded-xl border border-dashed px-6 py-10 text-center">
                  <p className="text-sm font-semibold">No finalized invoices</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Finalize an open invoice to see outstanding balances.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {overview.issuedInvoiceTotals.map((metric) => (
                    <div
                      key={metric.currency}
                      className="bg-background/50 border-border/50 rounded-xl border p-5 shadow-sm backdrop-blur-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                          {metric.currency} Outstanding
                        </p>
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                          Owed
                        </span>
                      </div>
                      <p className="text-3xl font-extrabold tracking-tighter text-rose-600 dark:text-rose-400">
                        {formatMoney(metric.totalOutstanding, metric.currency)}
                      </p>
                      <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-3">
                        <p className="text-muted-foreground text-sm font-medium">
                          Total Invoiced (All-time)
                        </p>
                        <p className="text-sm font-semibold">
                          {formatMoney(metric.totalIssued, metric.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Page>
  )
}

function MetricCard({
  label,
  value,
  color,
  trend,
}: {
  label: string
  value: string
  color: string
  trend?: string
}) {
  return (
    <div className="876-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40 ${color.split(' ')[0]}`}
      />
      <div className="mb-4 flex items-start justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {trend && (
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  )
}

function formatMoney(amount: bigint, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) / 100)
}
