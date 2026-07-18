import { CircleStackIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { AddonsTable } from './addons-table'

export const metadata = { title: 'Add-ons' }
const STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Add-ons' },
  { value: 'active', label: 'Active', headingLabel: 'Active Add-ons' },
  { value: 'inactive', label: 'Archived', headingLabel: 'Archived Add-ons' },
]

export default async function AddonsPage({
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
  const addons = await service.addons.list(
    context.tenant.id,
    selected === 'all' ? undefined : selected === 'active'
  )
  const canWrite = context.permissions.includes('catalog:write')

  return (
    <Page>
      <ResourceToolbar
        title="Add-ons"
        titleFilter={
          <StatusFilterHeading
            label="Add-ons"
            value={selected}
            options={STATUS_OPTIONS}
          />
        }
        primaryLabel={canWrite ? 'Add' : undefined}
        primaryHref={canWrite ? '/addons/new' : undefined}
        primaryVariant="info"
        refresh
      />
      <AddonsTable
        addons={addons}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleStackIcon />
              </EmptyMedia>
              <EmptyTitle>No add-ons yet</EmptyTitle>
              <EmptyDescription>
                Add modular recurring or one-time services to your plans.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
