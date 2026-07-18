import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Customer' }

export default async function NewCustomerPage() {
  const context = await requirePagePermission('customers:write')

  const [currencies, priceLists] = await Promise.all([
    service.currencies.list(context.tenant.id),
    service.priceLists.list(context.tenant.id, true),
  ])

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
          Create an external customer for quotes, invoices, and subscriptions.
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
            options: currencies.map(({ currency }) => ({
              value: currency.code,
              label: `${currency.name} (${currency.code})`,
            })),
          },
          {
            name: 'priceListId',
            label: 'Price list',
            type: 'select',
            description:
              'Used as the default pricing policy for future transactions.',
            options: priceLists.map((priceList) => ({
              value: priceList.id,
              label: priceList.name,
            })),
          },
        ]}
      />
    </Page>
  )
}
