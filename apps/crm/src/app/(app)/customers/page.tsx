import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

export const metadata = { title: 'Customers' }

export default function CustomersPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Customers"
        primaryLabel="Add"
        primaryHref="/customers/new"
        primaryVariant="info"
      />
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No CRM customers yet</EmptyTitle>
          <EmptyDescription>
            CRM customer profiles will reference the shared 876 customer registry rather than duplicate customer identity.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          Customer persistence is intentionally deferred to the CRM data-service implementation.
        </EmptyContent>
      </Empty>
    </Page>
  )
}
