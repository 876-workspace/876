import { notFound, redirect } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'
import { InvoiceSalesReceiptRefundForm } from '../../_components/sales-receipt-refund-form'

export const metadata = { title: 'Refund Sales Receipt' }

type Props = { params: Promise<{ salesReceiptId: string }> }

export default async function RefundSalesReceiptPage({ params }: Props) {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (access.status !== 'ok' || !canAccess(access.context, 'invoices.edit'))
    redirect('/no-access')

  const { salesReceiptId } = await params
  const billing = await getBilling(context.orgId)
  const [receiptResult, accounts, modes, currencies] = await Promise.all([
    billing.salesReceipts.retrieve(salesReceiptId),
    billing.bankAccounts.list(),
    billing.paymentModes.list(),
    billing.currencies.list(),
  ])

  if (receiptResult.error?.code === 'sales-receipt/not-found') notFound()
  const unavailable = (code: string) => (
    <Page>
      <AppError
        error={{
          code,
          message: 'Sales receipt refund data is unavailable right now.',
        }}
      />
    </Page>
  )
  if (receiptResult.error) return unavailable(receiptResult.error.code)
  if (accounts.error) return unavailable(accounts.error.code)
  if (modes.error) return unavailable(modes.error.code)
  if (currencies.error) return unavailable(currencies.error.code)

  const receipt = receiptResult.data
  if (receipt.status !== 'PAID' || BigInt(receipt.refundableAmount) <= 0n)
    notFound()

  const currencyRow = currencies.data.data.find(
    ({ currency }) => currency.code === receipt.currency
  )
  const decimalPlaces = currencyRow?.currency.decimalPlaces ?? 2

  return (
    <Page>
      <PageBreadcrumb
        href={`/sales-receipts/${receipt.id}`}
        label={receipt.number}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Refund sales receipt</PageTitle>
      </PageHeader>

      <InvoiceSalesReceiptRefundForm
        salesReceiptId={receipt.id}
        number={receipt.number}
        currency={receipt.currency}
        decimalPlaces={decimalPlaces}
        availableAmount={receipt.refundableAmount}
        modes={modes.data.data
          .filter((mode) => mode.isActive)
          .map((mode) => ({ value: mode.id, label: mode.name }))}
        accounts={accounts.data.data
          .filter((account) => account.isActive)
          .map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
            currency: account.currency,
          }))}
      />
    </Page>
  )
}
