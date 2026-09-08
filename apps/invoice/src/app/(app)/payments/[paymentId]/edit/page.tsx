import { notFound, redirect } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { InvoicePaymentReceivedForm } from '@/features/payments/components/payment-received-form'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'Edit payment' }

type Props = { params: Promise<{ paymentId: string }> }

const COLLECTIBLE_STATUSES = new Set([
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
])

export default async function EditPaymentPage({ params }: Props) {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (access.status !== 'ok' || !canAccess(access.context, 'payments.edit'))
    redirect('/no-access')

  const { paymentId } = await params
  const billing = await getBilling(context.orgId)
  const [paymentResult, customers, accounts, modes, currencies, invoices] =
    await Promise.all([
      billing.payments.retrieve(paymentId),
      billing.customers.list(),
      billing.bankAccounts.list(),
      billing.paymentModes.list(),
      billing.currencies.list(),
      billing.invoices.list(),
    ])

  if (paymentResult.error?.code.endsWith('/not-found')) notFound()
  if (
    paymentResult.error !== null ||
    customers.error !== null ||
    accounts.error !== null ||
    modes.error !== null ||
    currencies.error !== null ||
    invoices.error !== null
  ) {
    const failure =
      paymentResult.error ??
      customers.error ??
      accounts.error ??
      modes.error ??
      currencies.error ??
      invoices.error
    return (
      <Page>
        <AppError
          error={{
            code: failure?.code ?? 'billing/payment-form-unavailable',
            message: 'Payment entry data is unavailable right now.',
          }}
        />
      </Page>
    )
  }

  const payment = paymentResult.data
  if (payment.status !== 'SUCCEEDED') notFound()

  const currentAllocations = new Map(
    payment.invoiceAllocations.map((allocation) => [
      allocation.invoice.id,
      BigInt(allocation.amount),
    ])
  )
  const currencyRows = currencies.data.data.filter(
    (row) => row.isEnabled || row.currency.code === payment.currency
  )

  return (
    <Page>
      <PageBreadcrumb
        href={`/payments/${payment.id}`}
        label={payment.number}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit payment</PageTitle>
        <PageDescription>
          Saving replaces the allocation set and recalculates invoice balances.
        </PageDescription>
      </PageHeader>
      <InvoicePaymentReceivedForm
        customers={customers.data.data
          .filter(
            (customer) =>
              customer.status === 'ACTIVE' || customer.id === payment.customer.id
          )
          .map((customer) => ({ value: customer.id, label: customer.name }))}
        accounts={accounts.data.data
          .filter(
            (account) =>
              account.isActive || account.id === payment.depositAccount.id
          )
          .map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
            currency: account.currency,
          }))}
        modes={modes.data.data
          .filter((mode) => mode.isActive || mode.id === payment.paymentMode.id)
          .map((mode) => ({ value: mode.id, label: mode.name }))}
        currencies={currencyRows.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
          decimalPlaces: currency.decimalPlaces,
        }))}
        invoices={invoices.data.data.flatMap((invoice) => {
          const status = stringField(invoice, 'status')
          const amountDue = stringField(invoice, 'amountDue')
          const invoiceCustomerId = stringField(invoice, 'customerId')
          const currency = stringField(invoice, 'currency')
          const number = stringField(invoice, 'number')
          if (!status || !amountDue || !invoiceCustomerId || !currency || !number)
            return []

          const currentAllocation = currentAllocations.get(invoice.id) ?? 0n
          const editableAmountDue = BigInt(amountDue) + currentAllocation
          const isCurrent = currentAllocation > 0n
          const isEligible = isCurrent
            ? status !== 'DRAFT' && status !== 'VOID' && status !== 'UNCOLLECTIBLE'
            : COLLECTIBLE_STATUSES.has(status) && BigInt(amountDue) > 0n
          if (!isEligible) return []

          return [
            {
              id: invoice.id,
              customerId: invoiceCustomerId,
              number,
              currency,
              amountDue: editableAmountDue.toString(),
            },
          ]
        })}
        defaultCurrency={payment.currency}
        initial={{
          id: payment.id,
          number: payment.number,
          customerId: payment.customer.id,
          paymentModeId: payment.paymentMode.id,
          depositAccountId: payment.depositAccount.id,
          amount: payment.amount,
          bankCharges: payment.bankCharges,
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          allocations: payment.invoiceAllocations.map((allocation) => ({
            invoiceId: allocation.invoice.id,
            amount: allocation.amount,
          })),
        }}
        canDelete={canAccess(access.context, 'payments.delete')}
      />
    </Page>
  )
}

function stringField(
  record: Record<string, unknown>,
  key: string
): string | null {
  return typeof record[key] === 'string' ? record[key] : null
}
