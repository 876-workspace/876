import { Page } from '@876/ui/page'
import { PageBreadcrumb } from '@876/ui/page-breadcrumb'

export const metadata = { title: 'Add ticket' }

export default function NewTicketPage() {
  return (
    <Page>
      <PageBreadcrumb href="/tickets" label="Tickets" className="mb-4" />
      <h1 className="876-page-title">Add ticket</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        The data-plane pass will wire customer, category, status, assignee, description, and ticket-note persistence here.
      </p>
    </Page>
  )
}
