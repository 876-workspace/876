import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { CreateForm } from '@/components/patterns/create-form'
import { getInvoiceContext } from '@/lib/auth/context'
import { getPlatformClient } from '@/lib/876/platform-client'

export const metadata = { title: 'New Customer' }

export default async function NewCustomerPage() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const platform = await getPlatformClient()
  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency = organization.data?.currency_code ?? 'JMD'

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
        <span className="font-medium">New Customer</span>
      </nav>

      <PageHeader>
        <PageTitle>New Customer</PageTitle>
        <PageDescription>
          Create a customer for quotes, invoices, and sales receipts.
        </PageDescription>
      </PageHeader>

      <CreateForm
        title="Customer"
        endpoint="/api/v1/customers"
        returnUrl="/customers"
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          {
            name: 'email',
            label: 'Email address',
            type: 'email',
            placeholder: 'customer@example.com',
          },
          { name: 'phone', label: 'Phone', type: 'text' },
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
