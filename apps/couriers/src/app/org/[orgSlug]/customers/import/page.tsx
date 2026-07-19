import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { CustomerImportWizard } from '@/components/customers/customer-import-wizard'

export const metadata = { title: 'Import Customers' }

export default async function ImportCustomersPage({
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
        <PageTitle>Import Customers</PageTitle>
      </PageHeader>
      <CustomerImportWizard customersHref={customersHref} orgSlug={orgSlug} />
    </Page>
  )
}
