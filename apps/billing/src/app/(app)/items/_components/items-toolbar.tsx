'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { useBillingPermission } from '@/components/providers/permissions-provider'

const ITEM_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

export function ItemsToolbar({ status }: { status: string }) {
  const canWrite = useBillingPermission('catalog:write')

  return (
    <ResourceToolbar
      title="Items"
      titleFilter={
        <StatusFilterHeading
          label="Items"
          value={status}
          options={ITEM_STATUS_OPTIONS}
        />
      }
      primaryLabel={canWrite ? 'Add' : undefined}
      primaryHref={canWrite ? '/items/new' : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
