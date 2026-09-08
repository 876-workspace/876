import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { RefundForm } from '@/features/payments/components/refund-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service, type LegacyBillingRecord } from '@/lib/service'

export const metadata = { title: 'Refund payment' }

type Props = { params: Promise<{ paymentId: string }> }

export default async function RefundPaymentPage({ params }: Props) {
  const context = await requirePagePermission('payments:write')
  const { paymentId } = await params
  const [payment, accounts, modes, currencies] = await Promise.all([
    service.payments.retrieve(context.tenant.id, paymentId) as Promise<LegacyBillingRecord>,
    service.bankAccounts.list(context.tenant.id),
    service.paymentModes.list(context.tenant.id),
    service.currencies.list(context.tenant.id),
  ])
  if (!payment) notFound()
  if (
    (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') ||
    payment.unappliedAmount <= 0n
  )
    notFound()

  const decimalPlaces =
    currencies.find(({ currency }) => currency.code === payment.currency)?.currency
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
        customerId={payment.customerId}
        currency={payment.currency}
        decimalPlaces={decimalPlaces}
        availableAmount={payment.unappliedAmount.toString()}
        modes={modes
          .filter((mode) => mode.isActive || mode.id === payment.paymentModeId)
          .map((mode) => ({ value: mode.id, label: mode.name }))}
        accounts={accounts
          .filter(
            (account) => account.isActive || account.id === payment.depositAccountId
          )
          .map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
            currency: account.currency,
          }))}
        defaultModeId={payment.paymentModeId}
        defaultAccountId={payment.depositAccountId}
        paymentId={payment.id}
        sourceLabel={`${payment.number} · unapplied payment credit`}
        returnHref={`/payments/${payment.id}`}
      />
    </Page>
  )
}
