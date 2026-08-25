import { Page, PageBreadcrumb } from '@876/ui/page'

export const metadata = { title: 'Add customer' }

export default function NewCustomerPage() {
  return (
    <Page>
      <PageBreadcrumb href="/customers" label="Customers" className="mb-4" />
      <h1 className="876-page-title">Add customer</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This screen is reserved for the CRM data-plane pass. It will create or
        select a customer in the shared customer registry, then create the
        CRM-local profile.
      </p>
    </Page>
  )
}
