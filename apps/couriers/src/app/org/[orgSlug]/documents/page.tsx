import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'

export const metadata = { title: 'Documents' }

export default function DocumentsPage() {
  return (
    <Page>
      <ResourceToolbar title="Documents" refresh />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DocumentTextIcon />
          </EmptyMedia>
          <EmptyTitle>No documents</EmptyTitle>
          <EmptyDescription>
            Documents created for this organization will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
