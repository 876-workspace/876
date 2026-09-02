import { redirect } from 'next/navigation'
import { ReceiptText } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getInvoiceContext } from '@/lib/auth/context'
import { listInvoices } from '@/app/(app)/_lib/list-data'
import { SalesReceiptsList } from './sales-receipts-list'

function SalesReceiptsEmptyState() {
  return (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptText />
        </EmptyMedia>
        <EmptyTitle>No sales receipts yet</EmptyTitle>
        <EmptyDescription>
          Record a cash sale when payment is received at the point of sale.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export async function SalesReceiptsListData() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  // Sales Receipts share the invoice family — reuse invoices endpoint until dedicated resource exists.
  const result = (await listInvoices(context.orgId).catch(
    () => ({ data: null, error: { code: 'unreachable' } }) as const
  )) as unknown as { data: { data: unknown[] } | null; error: unknown | null }

  const receipts =
    result.error || !result.data || result.data.data.length === 0
      ? []
      : (result.data.data as Record<string, unknown>[])
          .slice(0, 5)
          .map((receipt) => ({
            id: String(receipt.id),
            number: String(receipt.number ?? receipt.id),
            customer: {
              name: String(
                (receipt.customer as Record<string, unknown>)?.name ??
                  receipt.customerName ??
                  '—'
              ),
            },
            totalAmount: (receipt.totalAmount as string) ?? '0',
            currency: String(receipt.currency ?? 'JMD'),
            status: String(receipt.status ?? 'PAID'),
            date:
              typeof receipt.createdAt === 'number'
                ? receipt.createdAt
                : typeof receipt.date === 'number'
                  ? receipt.date
                  : null,
          }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SalesReceiptsList
        receipts={receipts}
        emptyState={<SalesReceiptsEmptyState />}
      />
    </div>
  )
}
