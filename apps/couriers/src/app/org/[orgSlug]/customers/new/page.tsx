import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { CustomerCreateForm } from './customer-create-form'

export const metadata = { title: 'New Customer' }

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const customersHref = `/org/${orgSlug}/customers`

  return (
    <Page>
      <PageBreadcrumb
        href={customersHref}
        label="Customers"
        className="mb-4 -ml-2.5"
      />
      <PageHeader>
        <PageTitle>New Customer</PageTitle>
      </PageHeader>
      <CustomerCreateForm customersHref={customersHref} orgSlug={orgSlug} />
    </Page>
  )
}
