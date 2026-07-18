import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Plan' }

export default async function NewPlanPage() {
  const context = await requirePagePermission('catalog:write')

  const [products, currencies] = await Promise.all([
    service.products.list(context.tenant.id, true),
    service.currencies.list(context.tenant.id),
  ])

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/plans"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Plans
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Plan</span>
      </nav>

      <PageHeader>
        <PageTitle>New Plan</PageTitle>
        <PageDescription>
          Create a plan beneath a product. Add one or more currency-specific
          prices afterward.
        </PageDescription>
      </PageHeader>

      <CreateForm
        title="Plan"
        endpoint="/api/v1/plans"
        returnUrl="/plans"
        fields={[
          {
            name: 'productId',
            label: 'Product',
            type: 'select',
            required: true,
            options: products.map((product) => ({
              value: product.id,
              label: product.name,
            })),
          },
          { name: 'code', label: 'Plan code', type: 'text', required: true },
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'text' },
          { name: 'imageUrl', label: 'Image URL', type: 'text' },
          {
            name: 'unitName',
            label: 'Unit name',
            type: 'text',
            placeholder: 'seat, user, workspace',
          },
          {
            name: 'intervalUnit',
            label: 'Bill every',
            type: 'select',
            required: true,
            initialValue: 'MONTH',
            options: [
              { label: 'Day', value: 'DAY' },
              { label: 'Week', value: 'WEEK' },
              { label: 'Month', value: 'MONTH' },
              { label: 'Year', value: 'YEAR' },
            ],
          },
          {
            name: 'intervalCount',
            label: 'Frequency count',
            type: 'number',
            required: true,
            initialValue: '1',
          },
          {
            name: 'trialDays',
            label: 'Free trial (days)',
            type: 'number',
            initialValue: '0',
          },
          {
            name: 'billingCycleCount',
            label: 'Billing cycles',
            type: 'number',
            description: 'Leave blank to renew until canceled.',
          },
          {
            name: 'setupFeeAmount',
            label: 'Setup fee',
            type: 'money',
            pairedWith: 'setupFeeCurrency',
          },
          {
            name: 'setupFeeCurrency',
            label: 'Setup fee currency',
            type: 'select',
            pairedWith: 'setupFeeAmount',
            options: currencies.map(({ currency }) => ({
              label: `${currency.name} (${currency.code})`,
              value: currency.code,
            })),
          },
          { name: 'taxCode', label: 'Tax code', type: 'text' },
          { name: 'isTaxable', label: 'Taxable plan', type: 'checkbox' },
          {
            name: 'isFree',
            label: 'Free plan',
            type: 'checkbox',
            description: 'Only zero-amount price points can be attached.',
          },
          {
            name: 'showInCheckout',
            label: 'Show in checkout',
            type: 'checkbox',
            initialValue: true,
          },
        ]}
      />
    </Page>
  )
}
