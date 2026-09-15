import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

type Props = { orgSlug: string }

export function WarehousesShell({ orgSlug }: Props) {
  return (
    <>
      <ResourceToolbar
        title="Warehouses"
        titleFilter={
          <StatusFilterHeading
            label="Warehouses"
            value="all"
            options={[{ value: 'all', label: 'All Warehouses' }]}
          />
        }
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/settings/warehouses/new`}
        primaryVariant="info"
        refresh
      />
    </>
  )
}
