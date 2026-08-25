import { Page, PageBreadcrumb } from '@876/ui/page'

import { CustomerForm } from '../_components/customer-form'

export const metadata = { title: 'Add customer' }

export default function NewCustomerPage() {
  return (
    <Page>
      <PageBreadcrumb href="/customers" label="Customers" className="mb-4" />
      <h1 className="876-page-title mb-6">Add customer</h1>
      <CustomerForm />
    </Page>
  )
}
