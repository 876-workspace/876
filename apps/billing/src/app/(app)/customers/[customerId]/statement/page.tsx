import { Suspense } from 'react'
import {
  CustomerStatementPanel,
  CustomerStatementPanelSkeleton,
} from '@876/billing-ui/panels/customer-statement-panel'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'

export default function CustomerStatementPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  return (
    <Suspense fallback={<CustomerStatementPanelSkeleton />}>
      <CustomerStatementData params={params} />
    </Suspense>
  )
}

async function CustomerStatementData({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const billing = await getBilling()
  const result = await billing.customers.account(customerId)

  if (result.error)
    return (
      <CustomerStatementPanel
        state={{ status: 'error', error: result.error }}
      />
    )

  const account = result.data
  const currency = account.currency ?? '—'
  const money = (amount: string) =>
    account.currency
      ? formatMoney(amount, account.currency)
      : `${amount} minor units`

  return (
    <CustomerStatementPanel
      state={{
        status: 'ready',
        data: {
          currency,
          openingBalance: money(account.openingBalance),
          rows: account.statement.map((entry) => ({
            id: entry.id,
            date: formatDate(entry.effectiveAt),
            description:
              entry.description ??
              entry.type.toLowerCase().replaceAll('_', ' '),
            amount: money(
              entry.direction === 'DEBIT'
                ? entry.amount
                : (-BigInt(entry.amount)).toString()
            ),
            balance: money(entry.balance),
          })),
          closingBalance: money(account.closingBalance),
        },
      }}
    />
  )
}
