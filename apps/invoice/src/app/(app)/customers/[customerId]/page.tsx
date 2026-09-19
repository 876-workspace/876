import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CustomerContactsPanelSkeleton } from '@876/billing-ui/panels/customer-contacts-panel'
import {
  CustomerReceivablesPanel,
  CustomerReceivablesPanelSkeleton,
} from '@876/billing-ui/panels/customer-receivables-panel'

import { getInvoiceContext } from '@/lib/auth/context'
import { formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/clients/billing'
import { CustomerContacts } from './_components/customer-contacts'
import {
  CustomerSalesSummaryData,
  CustomerSalesSummaryFallback,
} from './_components/customer-sales-summary'

export const metadata: Metadata = {
  title: 'Customer',
  description: 'Customer details.',
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<CustomerReceivablesPanelSkeleton />}>
        <CustomerReceivablesData params={params} />
      </Suspense>
      <Suspense fallback={<CustomerSalesSummaryFallback />}>
        <CustomerSalesSummaryRouteData params={params} />
      </Suspense>
      <Suspense fallback={<CustomerContactsPanelSkeleton />}>
        <CustomerContactsData params={params} />
      </Suspense>
    </div>
  )
}

async function CustomerSalesSummaryRouteData({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  return <CustomerSalesSummaryData customerId={customerId} />
}

async function CustomerReceivablesData({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) return null
  const billing = await getBilling(context.orgId)
  const result = await billing.customers.account(customerId)

  if (result.error)
    return (
      <CustomerReceivablesPanel
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
    <CustomerReceivablesPanel
      state={{
        status: 'ready',
        data: {
          outstanding: money(account.outstandingReceivable),
          overdue: money(account.overdueReceivable),
          availableCredit: money(account.availableCredit),
          netPosition: money(account.netPosition),
          billed: money(account.lifetimeBilled),
          paid: money(account.lifetimePaid),
          currency,
        },
      }}
    />
  )
}

async function CustomerContactsData({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) return null
  const billing = await getBilling(context.orgId)
  const result = await billing.customers.contacts.list(customerId)
  const state = result.error
    ? { status: 'error' as const, error: result.error }
    : result.data.data.length
      ? { status: 'ready' as const, data: result.data.data }
      : { status: 'empty' as const }
  return (
    <CustomerContacts
      customerId={customerId}
      state={state}
      canManage={context.role !== 'staff'}
    />
  )
}
