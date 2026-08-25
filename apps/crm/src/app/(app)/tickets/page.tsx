import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

export const metadata = { title: 'Tickets' }

export default function TicketsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Tickets"
        primaryLabel="Add"
        primaryHref="/tickets/new"
        primaryVariant="info"
      />
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No tickets yet</EmptyTitle>
          <EmptyDescription>
            Tickets will belong to a shared customer relationship and can carry a category, status, assignee, and notes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          Ticket persistence is intentionally deferred to the CRM data-service implementation.
        </EmptyContent>
      </Empty>
    </Page>
  )
}
