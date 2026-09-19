import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { ReconciliationWorkspace } from '@/features/banking/components/reconciliation-workspace'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getBilling } from '@/lib/clients/billing'

type Props = { params: Promise<{ accountId: string }> }

export const metadata: Metadata = {
  title: 'Reconcile Bank Account',
}

export default async function ReconcileBankAccountPage({ params }: Props) {
  const [context, billing, { accountId }] = await Promise.all([
    requirePagePermission('banking:write'),
    getBilling(),
    params,
  ])
  const [account, currencies, transactions, reconciliations] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.currencies.list(context.tenant.id),
    billing.bankTransactions.list(accountId),
    billing.bankReconciliations.list(accountId),
  ])
  if (!account) notFound()

  const currency = currencies.find(
    ({ currency: item }) => item.code === account.currency
  )?.currency
  const initialError = transactions.error ?? reconciliations.error ?? null

  return (
    <Page>
      <PageBreadcrumb
        href={`/banking/${account.id}`}
        label={account.name}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Reconcile {account.name}</PageTitle>
        <PageDescription>
          Compare booked cash with an external statement period and preserve the
          completed reconciliation as historical evidence.
        </PageDescription>
      </PageHeader>
      <ReconciliationWorkspace
        accountId={account.id}
        currency={account.currency}
        decimalPlaces={currency?.decimalPlaces ?? 2}
        transactions={transactions.data?.data ?? []}
        initialReconciliations={reconciliations.data?.data ?? []}
        initialError={initialError?.message ?? null}
      />
    </Page>
  )
}
