import { notFound } from 'next/navigation'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'
import { BankDepositForm } from '@/features/banking/components/bank-deposit-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getBilling } from '@/lib/services/billing'

export default async function NewBankDepositPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const [context, billing, { accountId }] = await Promise.all([
    requirePagePermission('banking:write'),
    getBilling(),
    params,
  ])
  const [account, transactionResult, accounts] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    billing.bankTransactions.list(accountId),
    service.bankAccounts.list(context.tenant.id),
  ])
  if (
    !account ||
    !['UNDEPOSITED_FUNDS', 'PETTY_CASH'].includes(account.accountType)
  )
    notFound()
  return (
    <Page>
      <PageBreadcrumb
        href={`/banking/${accountId}`}
        label={account.name}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Record deposit</PageTitle>
        <PageDescription>
          Move received cash into a checking or savings account.
        </PageDescription>
      </PageHeader>
      <BankDepositForm
        sourceAccountId={accountId}
        currency={account.currency}
        transactions={(transactionResult.data?.data ?? []).filter(
          (transaction) =>
            transaction.type === 'CREDIT' && transaction.status !== 'EXCLUDED'
        )}
        destinations={accounts
          .filter(
            (candidate) =>
              candidate.isActive &&
              candidate.currency === account.currency &&
              ['CHECKING', 'SAVINGS'].includes(candidate.accountType)
          )
          .map(({ id, name }) => ({ id, name }))}
      />
    </Page>
  )
}
