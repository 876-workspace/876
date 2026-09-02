import { redirect } from 'next/navigation'
import { CreditCardIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getInvoiceContext } from '@/lib/auth/context'
import { listPayments } from '@/app/(app)/_lib/list-data'
import { PaymentsList } from './payments-list'

function PaymentsEmptyState() {
  return (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCardIcon />
        </EmptyMedia>
        <EmptyTitle>No payments received</EmptyTitle>
        <EmptyDescription>
          Record a customer payment and distribute it across one or more open
          invoices.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export async function PaymentsListData() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = (await listPayments(context.orgId).catch(
    () => ({ data: null, error: { code: 'unreachable' } }) as const
  )) as unknown as { data: { data: unknown[] } | null; error: unknown | null }

  const payments =
    result.error || !result.data || result.data.data.length === 0
      ? []
      : (result.data.data as Record<string, unknown>[]).map((payment) => ({
          id: String(payment.id),
          number: String(payment.number ?? payment.id),
          customer: {
            name: String(
              (payment.customer as Record<string, unknown>)?.name ??
                payment.customerName ??
                '—'
            ),
          },
          amount: (payment.amount as string) ?? '0',
          currency: String(payment.currency ?? 'JMD'),
          paymentDate:
            typeof payment.paymentDate === 'number'
              ? payment.paymentDate
              : typeof payment.createdAt === 'number'
                ? payment.createdAt
                : null,
          status: String(payment.status ?? 'RECEIVED'),
          depositAccount: String(
            (payment.depositAccount as Record<string, unknown>)?.name ??
              payment.accountName ??
              'Undeposited'
          ),
        }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PaymentsList payments={payments} emptyState={<PaymentsEmptyState />} />
    </div>
  )
}
