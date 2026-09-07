import { notFound, redirect } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { getInvoice } from '@/lib/invoice'
import { StockAdjustmentForm } from './_components/stock-adjustment-form'

export const metadata = { title: 'Adjust item stock' }

export default async function ItemStockPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')
  if (invoice.role === 'staff') redirect(`/items/${itemId}`)

  const result = await invoice.items.retrieve(itemId)
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    redirect(`/items/${itemId}`)
  }

  const item = result.data
  if (item.type !== 'GOOD' || !item.trackStock)
    redirect(`/items/${item.id}`)

  return (
    <Page>
      <PageBreadcrumb
        href={`/items/${item.id}`}
        label={item.name}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Adjust stock</PageTitle>
        <PageDescription>
          Every change is recorded in the stock audit trail.
        </PageDescription>
      </PageHeader>
      <StockAdjustmentForm
        itemId={item.id}
        currentQuantity={item.stockQuantity ?? 0}
        allowOutOfStock={item.allowOutOfStock}
      />
    </Page>
  )
}
