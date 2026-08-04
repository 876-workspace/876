import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = { title: 'Add customer' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewCustomerPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/customers`}
        label="Customers"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Add customer</PageTitle>
      </PageHeader>
    </Page>
  )
}
