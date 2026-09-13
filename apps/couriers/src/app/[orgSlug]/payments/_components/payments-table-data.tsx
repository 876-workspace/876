import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CreditCardIcon } from '@876/ui/icons'
import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'

import { resolvePaymentStatus } from '../_lib/payments-list-config'
import { PaymentsList } from './payments-list'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

const MISSING_WORKSPACE_CODES = new Set([
  'billing/tenant-not-found',
  'billing/database-not-ready',
  'billing/unreachable',
])

export async function PaymentsTableData({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const { selected, filter } = resolvePaymentStatus(status)

  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCardIcon />
        </EmptyMedia>
        <EmptyTitle>No payments</EmptyTitle>
        <EmptyDescription>
          {selected === 'all' ? 'No payments yet.' : `No ${selected} payments.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <PaymentsList payments={[]} orgSlug={orgSlug} emptyState={emptyState} />
    )

  const payments = await billingIntegration.payments.list(ctx.orgId)

  const displayError =
    payments.error && !MISSING_WORKSPACE_CODES.has(payments.error.code)
      ? payments.error
      : null

  // The Billing integration payments list accepts no status parameter yet, so
  // the status filter narrows the returned page here until that gap is closed
  // in billing-api and `@876/billing/integration`.
  const rows = payments.error
    ? []
    : payments.data.data
        .filter((payment) => !filter || filter.includes(payment.status))
        .map((payment) => ({
          id: payment.id,
          number: payment.number,
          customerName: payment.customer.name,
          amount: payment.amount,
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          status: payment.status,
          depositAccountName: payment.depositAccount.name,
        }))

  return (
    <>
      {displayError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-[0.8125rem]">
          {displayError.message}
        </div>
      ) : null}

      <PaymentsList payments={rows} orgSlug={orgSlug} emptyState={emptyState} />
    </>
  )
}
