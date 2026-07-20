import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { LayoutList } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'

export default function WarehousePage() {
  return (
    <Page>
      <ResourceToolbar title="Warehouse" refresh />

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
