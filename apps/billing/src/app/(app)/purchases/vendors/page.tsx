import { Building2 } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { VendorsTable } from './vendors-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Vendors',
  description: 'Manage your vendors and suppliers.',
}

const VENDOR_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Vendors' },
  { value: 'active', label: 'Active', headingLabel: 'Active Vendors' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Vendors' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function VendorsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as 'ACTIVE' | 'ARCHIVED')

  const context = await getWorkspaceContext()
  if (!context) return null

  const vendors = await service.vendors.list(context.tenant.id, filterStatus)
  const rows = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    reference: vendor.externalReference ?? 'External vendor',
    defaultCurrency: vendor.defaultCurrency ?? context.tenant.defaultCurrency,
    status: vendor.status,
  }))

  return (
    <Page>
      <ResourceToolbar
        title="Vendors"
        titleFilter={
          <StatusFilterHeading
            label="Vendors"
            value={selectedStatus}
            options={VENDOR_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('purchases:write')
            ? 'New Vendor'
            : undefined
        }
        primaryHref={
          context.permissions.includes('purchases:write')
            ? '/purchases/vendors/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <VendorsTable
        vendors={rows}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>No vendors yet</EmptyTitle>
              <EmptyDescription>
                Vendors will appear here when you add them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
