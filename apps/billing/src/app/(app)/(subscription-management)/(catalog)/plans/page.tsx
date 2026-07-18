import { ClipboardList } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { PlansTable } from './plans-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Plans',
  description: 'Subscription plans and pricing.',
}

const PLAN_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Plans' },
  { value: 'active', label: 'Active', headingLabel: 'Active Plans' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Plans' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function PlansPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const plans = await service.plans.list(context.tenant.id, filterStatus)

  return (
    <Page>
      <ResourceToolbar
        title="Plans"
        titleFilter={
          <StatusFilterHeading
            label="Plans"
            value={selectedStatus}
            options={PLAN_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('catalog:write') ? 'Add' : undefined
        }
        primaryHref={
          context.permissions.includes('catalog:write')
            ? '/plans/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <PlansTable
        plans={plans}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>No plans yet</EmptyTitle>
              <EmptyDescription>
                Create a product first, then add the plan cadence that customers
                can subscribe to.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
