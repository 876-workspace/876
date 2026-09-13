import { redirect } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import {
  formatMinorUnits,
  type DocumentLineDraft,
} from '@876/billing-ui/document/document-line-items-editor'

import { resolveSalesOrder } from '@/app/(app)/_lib/detail-data'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { SalesOrderEditForm } from '../_components/sales-order-edit-form'

export const metadata = { title: 'Edit Sales Order' }

export default async function EditSalesOrderPage({
  params,
}: {
  params: Promise<{ salesOrderId: string }>
}) {
  const { salesOrderId } = await params
  const context = await requirePagePermission('sales-orders:write')
  const order = await resolveSalesOrder(context.tenant.id, salesOrderId)
  if (!order || order.status !== 'draft')
    redirect(`/sales-orders/${encodeURIComponent(salesOrderId)}`)
  const lines: DocumentLineDraft[] = order.lines.map((line) => ({
    id: line.id,
    itemId: line.itemId,
    variantId: line.variantId,
    priceId: line.priceId,
    description: line.description,
    quantity: String(line.quantity),
    unitAmount: formatMinorUnits(BigInt(line.unitAmount)),
    discountAmount: formatMinorUnits(BigInt(line.discountAmount)),
    taxAmount: formatMinorUnits(BigInt(line.taxAmount)),
  }))
  return (
    <Page>
      <PageHeader>
        <PageTitle>Edit Sales Order</PageTitle>
      </PageHeader>
      <SalesOrderEditForm
        salesOrderId={order.id}
        currency={order.currency}
        referenceNumber={order.referenceNumber}
        notes={order.notes}
        terms={order.terms}
        lines={lines}
      />
    </Page>
  )
}
