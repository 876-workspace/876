import { notFound, redirect } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getInvoiceBillingIntegration } from '@/lib/876/billing-integration'
import { getInvoiceContext } from '@/lib/auth/context'
import { getPlatformClient } from '@/lib/876/platform-client'
import { ItemForm } from '../../_components/item-form'

export const metadata = { title: 'Edit Item' }

interface Props {
  params: Promise<{ itemId: string }>
}

export default async function EditItemPage({ params }: Props) {
  const { itemId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getInvoiceBillingIntegration()
  const [itemResult, platform] = await Promise.all([
    billing.items.retrieve(context.orgId, itemId),
    getPlatformClient(),
  ])

  if (itemResult.error) {
    if (itemResult.error.code.endsWith('/not-found')) notFound()
    redirect('/items')
  }

  const item = itemResult.data
  const organization = await platform.organizations.retrieve({ id: context.orgId })
  const currency =
    organization.data?.currency_code ?? item.defaultSellingCurrency ?? 'JMD'

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Edit Item</PageTitle>
      </PageHeader>

      <ItemForm
        currency={currency}
        item={{
          id: item.id,
          type: item.type,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          description: item.description,
          defaultSellingAmount: item.defaultSellingAmount,
          defaultSellingCurrency: item.defaultSellingCurrency,
          isTaxable: item.isTaxable,
          taxCode: item.taxCode,
          isActive: item.isActive,
        }}
      />
    </Page>
  )
}
