import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

export const metadata = { title: 'Requests' }

export default function RequestsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Requests"
        primaryLabel="Add"
        primaryHref="/requests/new"
        primaryVariant="info"
      />
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No requests yet</EmptyTitle>
          <EmptyDescription>
            Requests belong to a shared customer relationship and can carry a category, status, assignee, and notes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          Request persistence will be owned by the CRM API.
        </EmptyContent>
      </Empty>
    </Page>
  )
}
