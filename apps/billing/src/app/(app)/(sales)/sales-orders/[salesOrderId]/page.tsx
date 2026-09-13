import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIdBar,
  DetailCardSection,
} from '@876/ui/detail-card'

import { resolveSalesOrder } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext, hasPermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'
import { SalesOrderActions } from './_components/sales-order-actions'

export default async function SalesOrderPage({
  params,
}: {
  params: Promise<{ salesOrderId: string }>
}) {
  const { salesOrderId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const order = await resolveSalesOrder(context.tenant.id, salesOrderId)
  if (!order) notFound()
  const canWrite = hasPermission(context, 'sales-orders:write')
  return (
    <DetailCard aria-label={`Sales order details: ${order.number}`}>
      <DetailCardHeader
        title={order.number}
        subtitle={order.customerName ?? '—'}
        meta={
          <Badge variant={documentStatusVariant(order.status)}>
            <span className="capitalize">{order.status}</span>
          </Badge>
        }
        actions={
          <SalesOrderActions
            salesOrderId={order.id}
            status={order.status}
            canWrite={canWrite}
          />
        }
        closeHref="/sales-orders"
        closeLabel="Close sales order details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(BigInt(order.totalAmount), order.currency)}
          caption="Sales order total"
        />
        <DetailCardSection title="Sales order">
          <DetailCardFacts>
            <DetailCardFact
              label="Customer"
              value={order.customerName ?? '—'}
            />
            <DetailCardFact
              label="Ordered"
              value={formatDate(order.orderedAt)}
            />
            <DetailCardFact
              label="Invoicing"
              value={
                <Badge
                  variant={
                    order.invoicingStatus === 'invoiced'
                      ? 'success'
                      : 'secondary'
                  }
                >
                  <span className="capitalize">{order.invoicingStatus}</span>
                </Badge>
              }
            />
            <DetailCardFact
              label="Payment"
              value={
                order.paymentStatus ? (
                  <Badge
                    variant={
                      order.paymentStatus === 'paid' ? 'success' : 'secondary'
                    }
                  >
                    <span className="capitalize">{order.paymentStatus}</span>
                  </Badge>
                ) : (
                  '—'
                )
              }
            />
            <DetailCardFact
              label="Invoice"
              value={
                order.invoiceId ? (
                  <Link
                    className="text-sky-600 hover:underline"
                    href={`/invoices/${order.invoiceId}`}
                  >
                    View invoice
                  </Link>
                ) : (
                  'Not invoiced'
                )
              }
            />
            <DetailCardFact
              label="Reference"
              value={order.referenceNumber ?? '—'}
            />
            <DetailCardFact label="Notes" value={order.notes ?? '—'} />
          </DetailCardFacts>
        </DetailCardSection>
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{order.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
