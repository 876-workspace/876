import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ClipboardDocumentListIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'

export default function PackagesPage() {
  return (
    <Page>
      <ResourceToolbar title="Packages" refresh />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardDocumentListIcon />
          </EmptyMedia>
          <EmptyTitle>No packages</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
