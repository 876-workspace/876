import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/billing-create-form'
import { CustomerInvoicePreferenceForm } from '@/components/customer-invoice-preference-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Edit Customer' }

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function EditCustomerPage({ params }: Props) {
  const { customerId } = await params
  const context = await requirePagePermission('customers:write')

  const [customer, currencies, priceLists] = await Promise.all([
    service.customers.retrieve(context.tenant.id, customerId),
    service.currencies.list(context.tenant.id),
    service.priceLists.list(context.tenant.id, true),
  ])
  if (!customer) notFound()

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

      <div className="space-y-6">
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
              initialValue: customer.defaultCurrency ?? '',
              options: currencies.map(({ currency }) => ({
                value: currency.code,
                label: `${currency.name} (${currency.code})`,
              })),
            },
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              initialValue: customer.status,
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ARCHIVED', label: 'Archived' },
              ],
            },
            {
              name: 'priceListId',
              label: 'Price list',
              type: 'select',
              initialValue: customer.priceListId ?? '',
              emptyAsNull: true,
              description:
                'Changes affect future documents; existing documents keep their pricing snapshot.',
              options: priceLists.map((priceList) => ({
                value: priceList.id,
                label: priceList.name,
              })),
            },
          ]}
        />
        <CustomerInvoicePreferenceForm
          customerId={customer.id}
          initial={{
            taxBehaviorOverride: customer.taxBehaviorOverride,
            lateFeeExempt: customer.lateFeeExempt,
            invoiceNotes: customer.invoiceNotes,
            invoiceTerms: customer.invoiceTerms,
          }}
        />
      </div>
    </Page>
  )
}
