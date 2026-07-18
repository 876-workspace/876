import { notFound } from 'next/navigation'

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

type Props = { params: Promise<{ accountId: string }> }

export default async function NewBankTransactionPage({ params }: Props) {
  const context = await requirePagePermission('banking:write')
  const { accountId } = await params
  const [account, currencies] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.currencies.list(context.tenant.id),
  ])
  if (!account?.isActive) notFound()
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
        <PageTitle>New transaction</PageTitle>
        <PageDescription>
          Record a manual credit or debit in {account.currency}.
        </PageDescription>
      </PageHeader>
      <BankTransactionForm
        accountId={account.id}
        currency={account.currency}
        decimalPlaces={decimalPlaces}
      />
    </Page>
  )
}
