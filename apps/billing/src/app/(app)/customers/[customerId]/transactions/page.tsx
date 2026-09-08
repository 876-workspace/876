import { CustomerTransactionsAccordions } from '@876/billing-ui/customer-transactions-accordions'
import { AppError } from '@876/ui/app-error'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/services/billing'

export default async function CustomerTransactionsPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const billing = await getBilling()
  const [accountResult, currenciesResult] = await Promise.all([
    billing.customers.account(customerId),
    billing.currencies.list(),
  ])
  if (accountResult.error || currenciesResult.error) {
    const failure = accountResult.error ?? currenciesResult.error
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

  return (
    <CustomerTransactionsAccordions
      entries={entries}
      currencyDecimals={currencyDecimals}
      hrefByEntryId={hrefByEntryId}
      includeCreditNotes
    />
  )
}
