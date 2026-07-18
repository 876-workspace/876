import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Item' }

export default async function NewItemPage() {
  const context = await requirePagePermission('catalog:write')

  const currencies = await service.currencies.list(context.tenant.id)

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/items"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Items
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Item</span>
      </nav>

      <PageHeader>
        <PageTitle>New Item</PageTitle>
        <PageDescription>
          Add a sellable good or service. Tax selection is stored now; tax
          calculation comes later.
        </PageDescription>
      </PageHeader>

      <CreateForm
        title="Item"
        endpoint="/api/v1/items"
        returnUrl="/items"
        fields={[
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            required: true,
            initialValue: 'SERVICE',
            options: [
              { label: 'Service', value: 'SERVICE' },
              { label: 'Good', value: 'GOOD' },
            ],
          },
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'sku', label: 'SKU', type: 'text' },
          {
            name: 'unit',
            label: 'Unit',
            type: 'text',
            placeholder: 'hour, piece, kg',
          },
          {
            name: 'defaultSellingAmount',
            label: 'Default selling price',
            type: 'money',
            pairedWith: 'defaultSellingCurrency',
          },
          {
            name: 'defaultSellingCurrency',
            label: 'Selling currency',
            type: 'select',
            pairedWith: 'defaultSellingAmount',
            options: currencies.map(({ currency }) => ({
              value: currency.code,
              label: `${currency.name} (${currency.code})`,
            })),
          },
          {
            name: 'isTaxable',
            label: 'Taxable item',
            type: 'checkbox',
            description:
              'Tax behavior is recorded but not calculated in this release.',
          },
        ]}
      />
    </Page>
  )
}
