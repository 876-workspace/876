import { redirect } from 'next/navigation'
import { ClipboardList } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getInvoiceContext } from '@/lib/auth/context'
import { listQuotes } from '@/app/(app)/_lib/list-data'
import { QuotesList } from './quotes-list'

function QuotesEmptyState() {
  return (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No quotes yet</EmptyTitle>
        <EmptyDescription>
          Create a customer and item, then prepare the first draft quote.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export async function QuotesListData() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = (await listQuotes(context.orgId).catch(
    () => ({ data: null, error: { code: 'unreachable' } }) as const
  )) as unknown as { data: { data: unknown[] } | null; error: unknown | null }

  const quotes =
    result.error || !result.data
      ? []
      : (result.data.data as Record<string, unknown>[]).map((quote) => ({
          id: String(quote.id),
          number: String(quote.number ?? quote.id),
          totalAmount:
            (quote.totalAmount as string) ?? (quote.amount as string) ?? '0',
          currency: String(quote.currency ?? 'JMD'),
          status: String(quote.status ?? 'DRAFT'),
          customer: {
            name: String(
              (quote.customer as Record<string, unknown>)?.name ??
                quote.customerName ??
                '—'
            ),
          },
          convertedInvoice:
            (quote.convertedInvoice as { number: string } | null) ?? null,
        }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <QuotesList quotes={quotes} emptyState={<QuotesEmptyState />} />
    </div>
  )
}
