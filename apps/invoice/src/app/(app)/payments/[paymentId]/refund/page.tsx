import { notFound, redirect } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { RefundForm } from '@/features/payments/components/refund-form'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'Refund payment' }

type Props = { params: Promise<{ paymentId: string }> }

export default async function RefundPaymentPage({ params }: Props) {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (access.status !== 'ok' || !canAccess(access.context, 'payments.edit'))
    redirect('/no-access')

  const { paymentId } = await params
  const billing = await getBilling(context.orgId)
  const [paymentResult, accounts, modes, currencies] = await Promise.all([
    billing.payments.retrieve(paymentId),
    billing.bankAccounts.list(),
    billing.paymentModes.list(),
    billing.currencies.list(),
  ])

  if (paymentResult.error?.code.endsWith('/not-found')) notFound()
  if (
    paymentResult.error !== null ||
    accounts.error !== null ||
    modes.error !== null ||
    currencies.error !== null
  ) {
    const failure =
      paymentResult.error ?? accounts.error ?? modes.error ?? currencies.error
    return (
      <Page>
        <AppError
          error={{
            code: failure?.code ?? 'billing/refund-form-unavailable',
            message: 'Refund entry data is unavailable right now.',
          }}
        />
      </Page>
    )
  }

  const payment = paymentResult.data
  if (
    (payment.status !== 'SUCCEEDED' &&
      payment.status !== 'PARTIALLY_REFUNDED') ||
    BigInt(payment.unappliedAmount) <= 0n
  )
    notFound()

  const currencyRows = currencies.data.data.filter((row) => row.isEnabled)
  const decimalPlaces =
    currencyRows.find((row) => row.currency.code === payment.currency)?.currency
      .decimalPlaces ?? 2

  return (
    <Page>
      <PageBreadcrumb
        href={`/payments/${payment.id}`}
        label={payment.number}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Refund payment</PageTitle>
        <PageDescription>
          Return unapplied customer credit and record where the money leaves the
          business.
        </PageDescription>
      </PageHeader>
      <RefundForm
        customerId={payment.customer.id}
        currency={payment.currency}
        decimalPlaces={decimalPlaces}
        availableAmount={payment.unappliedAmount}
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
        defaultModeId={
          modes.data.data.some(
            (mode) => mode.id === payment.paymentMode.id && mode.isActive
          )
            ? payment.paymentMode.id
            : modes.data.data.find((mode) => mode.isActive && mode.isDefault)
                ?.id
        }
        defaultAccountId={
          accounts.data.data.some(
            (account) =>
              account.id === payment.depositAccount.id && account.isActive
          )
            ? payment.depositAccount.id
            : undefined
        }
        paymentId={payment.id}
        sourceLabel={`${payment.number} · unapplied payment credit`}
        returnHref={`/payments/${payment.id}`}
      />
    </Page>
  )
}
