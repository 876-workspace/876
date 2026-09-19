import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CustomerSalesReceiptsAccordion } from '@876/billing-ui/customer-sales-receipts-accordion'
import {
  CustomerTransactionsAccordions,
  CustomerTransactionsAccordionsSkeleton,
} from '@876/billing-ui/customer-transactions-accordions'
import { AppError } from '@876/ui/app-error'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/clients/billing'

export const metadata: Metadata = {
  title: 'Transactions',
}

export default function CustomerTransactionsPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  return (
    <Suspense fallback={<CustomerTransactionsAccordionsSkeleton />}>
      <CustomerTransactionsData params={params} />
    </Suspense>
  )
}

async function CustomerTransactionsData({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const billing = await getBilling()
  const [accountResult, currenciesResult, salesReceiptsResult] =
    await Promise.all([
      billing.customers.account(customerId),
      billing.currencies.list(),
      billing.salesReceipts.list({ customerId }),
    ])
  if (
    accountResult.error ||
    currenciesResult.error ||
    salesReceiptsResult.error
  ) {
    const failure =
      accountResult.error ?? currenciesResult.error ?? salesReceiptsResult.error
    return (
      <AppError
        error={{
          code: failure?.code ?? 'billing/customer-transactions-unavailable',
          message: 'Customer transactions are unavailable right now.',
        }}
      />
    )
  }

  const entries = accountResult.data.statement
  const currencyDecimals = Object.fromEntries(
    currenciesResult.data.data.map(({ currency }) => [
      currency.code,
      currency.decimalPlaces,
    ])
  )
  const hrefByEntryId = Object.fromEntries(
    entries.flatMap((entry) => {
      if (entry.invoiceId) return [[entry.id, `/invoices/${entry.invoiceId}`]]
      if (entry.paymentId) return [[entry.id, `/payments/${entry.paymentId}`]]
      if (entry.creditNoteId)
        return [[entry.id, `/credit-notes/${entry.creditNoteId}`]]
      return []
    })
  )
  const salesReceipts = salesReceiptsResult.data.data
  const hrefBySalesReceiptId = Object.fromEntries(
    salesReceipts.map((receipt) => [
      receipt.id,
      `/sales-receipts/${receipt.id}`,
    ])
  )

  return (
    <div className="space-y-3">
      <CustomerSalesReceiptsAccordion
        receipts={salesReceipts}
        currencyDecimals={currencyDecimals}
        hrefBySalesReceiptId={hrefBySalesReceiptId}
      />
      <CustomerTransactionsAccordions
        entries={entries}
        currencyDecimals={currencyDecimals}
        hrefByEntryId={hrefByEntryId}
        includeCreditNotes
      />
    </div>
  )
}