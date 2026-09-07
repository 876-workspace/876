import { notFound, redirect } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { StockAdjustmentForm } from './_components/stock-adjustment-form'

export const metadata = { title: 'Adjust item stock' }

export default async function ItemStockPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await requirePagePermission('catalog:write')
  const item = await service.items.retrieve(context.tenant.id, itemId)
  if (!item) notFound()
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
