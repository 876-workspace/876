import { redirect } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'
import { AppError } from '@876/ui/app-error'

import { InvoicePaymentReceivedForm } from '@/features/payments/components/payment-received-form'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'Record Payment Received' }

type Props = {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>
}

export default async function NewPaymentPage({ searchParams }: Props) {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (
    access.status !== 'ok' ||
    !canAccess(access.context, 'invoices.write')
  )
    redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const [customers, accounts, modes, currencies, invoices] = await Promise.all([
    billing.customers.list(),
    billing.bankAccounts.list(),
    billing.paymentModes.list(),
    billing.currencies.list(),
    billing.invoices.list(),
  ])
  const failure =
    customers.error ??
    accounts.error ??
    modes.error ??
    currencies.error ??
    invoices.error
  if (failure) {
    return (
      <Page>
        <AppError
          error={{
            code: failure.code,
            message: 'Payment entry data is unavailable right now.',
          }}
        />
      </Page>
    )
  }

  const { customerId, invoiceId } = await searchParams
  const currencyRows = currencies.data.data.filter((row) => row.isEnabled)
  const defaultCurrency =
    currencyRows.find((row) => row.isDefault)?.currency.code ??
    currencyRows[0]?.currency.code ??
    'JMD'

  return (
    <Page>
      <PageBreadcrumb
        href="/payments"
        label="Payments Received"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Record payment received</PageTitle>
        <PageDescription>
          Record money from a customer, optionally apply it to outstanding
          invoices, and keep any unused amount as customer credit.
        </PageDescription>
      </PageHeader>
      <InvoicePaymentReceivedForm
        customers={customers.data.data
          .filter((customer) => customer.status === 'ACTIVE')
          .map((customer) => ({ value: customer.id, label: customer.name }))}
        accounts={accounts.data.data
          .filter((account) => account.isActive)
          .map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
            currency: account.currency,
          }))}
        modes={modes.data.data
          .filter((mode) => mode.isActive)
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
          if (
            !invoiceCustomerId ||
            !currency ||
            !number ||
            !amountDue ||
            status === 'DRAFT' ||
            status === 'PAID' ||
            status === 'VOID' ||
            status === 'UNCOLLECTIBLE' ||
            BigInt(amountDue) <= 0n
          )
            return []
          return [
            {
              id: invoice.id,
              customerId: invoiceCustomerId,
              number,
              currency,
              amountDue,
            },
          ]
        })}
        defaultCurrency={defaultCurrency}
        prefill={{ customerId, invoiceId }}
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
