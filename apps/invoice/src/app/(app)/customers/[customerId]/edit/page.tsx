import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/patterns/create-form'
import { get876Client } from '@/lib/876'
import { getInvoiceContext } from '@/lib/auth/context'
import { getPlatformClient } from '@/lib/876/platform-client'

export const metadata = { title: 'Edit Customer' }

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function EditCustomerPage({ params }: Props) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const $876 = await get876Client(context.orgId)
  const [customerResult, platform] = await Promise.all([
    $876.customers.retrieve(customerId),
    getPlatformClient(),
  ])

  if (customerResult.error) {
    if (customerResult.error.code.endsWith('/not-found')) notFound()
    redirect('/customers')
  }

  const customer = customerResult.data

  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency =
    organization.data?.currency_code ?? customer.defaultCurrency ?? 'JMD'

  const returnUrl = `/customers/${customer.id}`

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/customers"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Customers
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <Link
          href={returnUrl}
          className="text-muted-foreground hover:text-foreground max-w-[220px] truncate transition-colors"
        >
          {customer.name}
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">Edit</span>
      </nav>

      <PageHeader>
        <PageTitle>Edit Customer</PageTitle>
      </PageHeader>

      <CreateForm
        title="Customer"
        method="PATCH"
        endpoint={`/api/v1/customers/${customer.id}`}
        returnUrl={returnUrl}
        submitLabel="Save changes"
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            initialValue: customer.name,
          },
          {
            name: 'email',
            label: 'Email address',
            type: 'email',
            placeholder: 'customer@example.com',
            initialValue: customer.email ?? '',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            initialValue: customer.phone ?? '',
          },
          {
            name: 'currency',
            label: 'Default currency',
            type: 'select',
            locked: true,
            initialValue: currency,
            options: [{ value: currency, label: currency }],
          },
        ]}
      />
    </Page>
  )
}
