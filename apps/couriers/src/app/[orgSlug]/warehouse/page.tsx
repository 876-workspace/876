import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { LayoutList } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

export const metadata = { title: 'Warehouse' }

export default function WarehousePage() {
  return (
    <Page>
      <ResourceToolbar
        title="Warehouse"
        titleFilter={
          <StatusFilterHeading
            label="Warehouse"
            value="all"
            options={[{ value: 'all', label: 'All Warehouse Packages' }]}
          />
        }
        refresh
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutList />
          </EmptyMedia>
          <EmptyTitle>No warehouse packages</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
