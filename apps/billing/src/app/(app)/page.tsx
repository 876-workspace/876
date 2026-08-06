import { Page } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { DashboardHeader } from './_components/dashboard-header'
import { MetricCard } from './_components/dashboard-metric-card'
import { DashboardMrrSection } from './_components/dashboard-mrr-section'
import { DashboardReceivablesSection } from './_components/dashboard-receivables-section'

export const metadata = {
  title: 'Dashboard',
  description: 'Billing workspace overview.',
}

export default async function DashboardPage() {
  const context = await requirePagePermission('dashboard:read')
  const overview = await service.dashboard.overview(context.tenant.id)

  return (
    <Page className="pb-12">
      <DashboardHeader />

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
          <DashboardMrrSection metrics={overview.recurringRevenue} />
          <DashboardReceivablesSection metrics={overview.issuedInvoiceTotals} />
        </div>
      </div>
    </Page>
  )
}
