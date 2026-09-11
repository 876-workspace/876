import * as Sentry from '@sentry/nextjs'
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
import { redirectIfSignedOut } from '@/lib/auth/signed-out-error'
import { getBilling } from '@/lib/services/billing'
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

  const billing = await getBilling(context.orgId)
  const result = await billing.salesReceipts.list()
  if (result.error) {
    redirectIfSignedOut(result.error.code, '/sales-receipts')
    Sentry.captureMessage('Invoice sales receipts list failed', {
      level: 'error',
      tags: { category: 'billing_client' },
      extra: {
        call: 'salesReceipts.list',
        errorCode: result.error.code,
        organizationId: context.orgId,
      },
    })
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
        emptyState={<SalesReceiptsEmptyState />}
      />
    </div>
  )
}
