import { ReceiptText } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/clients/billing'
import { SalesReceiptsList } from './sales-receipts-list'

export async function SalesReceiptsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const billing = await getBilling()
  const result = await billing.salesReceipts.list()
  if (result.error) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          Sales receipts are unavailable right now
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {result.error.message}
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          {result.error.code}
        </p>
      </div>
    )
  }

  const receipts = result.data.data.map((receipt) => ({
    id: receipt.id,
    number: receipt.number,
    customer: {
      name:
        receipt.customer &&
        typeof receipt.customer === 'object' &&
        'name' in receipt.customer
          ? String(receipt.customer.name ?? '—')
          : typeof receipt.customerName === 'string'
            ? receipt.customerName
            : '—',
    },
    totalAmount: receipt.totalAmount,
    currency: receipt.currency,
    status: receipt.status,
    receiptAt: receipt.receiptAt,
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SalesReceiptsList
        receipts={receipts}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>No sales receipts yet</EmptyTitle>
              <EmptyDescription>
                Record an immediate paid sale without creating a receivable.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
