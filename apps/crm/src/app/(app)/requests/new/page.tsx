import { Page, PageBreadcrumb } from '@876/ui/page'

export const metadata = { title: 'Add request' }

export default function NewRequestPage() {
  return (
    <Page>
      <PageBreadcrumb href="/requests" label="Requests" className="mb-4" />
      <h1 className="876-page-title">Add request</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Customer, category, status, assignee, description, and request notes will be persisted by the CRM API.
      </p>
    </Page>
  )
}
