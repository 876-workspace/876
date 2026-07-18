import { notFound, redirect } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { BankTransactionForm } from '@/components/bank-transaction-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

type Props = {
  params: Promise<{ accountId: string; transactionId: string }>
}

export default async function EditBankTransactionPage({ params }: Props) {
  const context = await requirePagePermission('banking:write')
  const { accountId, transactionId } = await params
  const [account, transaction, currencies] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.bankTransactions.retrieve(
      context.tenant.id,
      accountId,
      transactionId
    ),
    service.currencies.list(context.tenant.id),
  ])
  if (!account || !transaction) notFound()
  if (transaction.paymentId) redirect(`/payments/${transaction.paymentId}`)
  const decimalPlaces =
    currencies.find(({ currency }) => currency.code === account.currency)
      ?.currency.decimalPlaces ?? 2

  return (
    <Page>
      <PageBreadcrumb
        href={`/banking/${account.id}`}
        label={account.name}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit transaction</PageTitle>
        <PageDescription>
          Correct or recategorize this manual account entry.
        </PageDescription>
      </PageHeader>
      <BankTransactionForm
        accountId={account.id}
        currency={account.currency}
        decimalPlaces={decimalPlaces}
        initial={{ ...transaction, amount: transaction.amount.toString() }}
      />
    </Page>
  )
}
