import { Building2 } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { VendorsTable } from '../_components/vendors-table'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
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

const COLUMNS = [
  { label: 'Vendor', cell: 'avatar' as const },
  { label: 'Reference' },
  { label: 'Currency' },
  { label: 'Status', cell: 'badge' as const },
]

export default async function VendorsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  return (
    <StreamingResourcePage
      title="Vendors"
      status={selectedStatus}
      options={VENDOR_STATUS_OPTIONS}
      primary={{
        label: 'New Vendor',
        href: '/purchases/vendors/new',
        permission: 'purchases:write',
      }}
      columns={COLUMNS}
    >
      <VendorsPageData selectedStatus={selectedStatus} />
    </StreamingResourcePage>
  )
}

async function VendorsPageData({ selectedStatus }: { selectedStatus: string }) {
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
  )
}
