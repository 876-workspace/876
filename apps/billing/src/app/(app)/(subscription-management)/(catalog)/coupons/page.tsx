import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { CouponsTable } from './coupons-table'

export const metadata = { title: 'Coupons' }

const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Coupons' },
  { value: 'active', label: 'Active', headingLabel: 'Active Coupons' },
  { value: 'inactive', label: 'Archived', headingLabel: 'Archived Coupons' },
]

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selected = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'
  const context = await getWorkspaceContext()
  if (!context) return null
  const coupons = await service.discounts.coupons.list(
    context.tenant.id,
    selected === 'all' ? undefined : selected === 'active'
  )
  const canWrite = context.permissions.includes('subscriptions:write')

  return (
    <Page>
      <ResourceToolbar
        title="Coupons"
        titleFilter={
          <StatusFilterHeading
            label="Coupons"
            value={selected}
            options={OPTIONS}
          />
        }
        primaryLabel={canWrite ? 'New Coupon' : undefined}
        primaryHref={canWrite ? '/coupons/new' : undefined}
        primaryVariant="info"
        refresh
      />
      {coupons.length ? (
        <CouponsTable coupons={coupons} />
      ) : (
        <div className="876-card text-muted-foreground p-10 text-center text-sm">
          No coupons match this view.
        </div>
      )}
    </Page>
  )
}
