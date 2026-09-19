import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
} from '@876/ui/detail-card'

import { StatementWorkspace } from '@/features/banking/components/statement-workspace'
import { BankIdentity } from '@/features/banking/components/bank-identity'
import { AccountNumberReveal } from '@/features/banking/components/account-number-reveal'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'
import { getBilling } from '@/lib/clients/billing'

type Props = { params: Promise<{ accountId: string }> }

export const metadata: Metadata = {
  title: 'Bank Account',
}

export default async function BankAccountPage({ params }: Props) {
  const [context, billing, { accountId }] = await Promise.all([
    requirePagePermission('banking:read'),
    getBilling(),
    params,
  ])
  const [account, transactions, statementLines, deposits] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.bankTransactions.list(context.tenant.id, accountId),
    billing.bankStatementLines.list(accountId),
    billing.bankDeposits.list(),
  ])
  if (!account) notFound()

  // One batch call per kind reuses the list's resolution path for a single
  // record; directory failure degrades to the stored institution name.
  const [banks, branches] = await Promise.all([
    account.directoryBankId
      ? billing.bankDirectory.listBanks('JM', {
          ids: [account.directoryBankId],
        })
      : null,
    account.directoryBranchId
      ? billing.bankDirectory.listBranchesByIds([account.directoryBranchId])
      : null,
  ])
  const bank = account.directoryBankId
    ? (banks?.data?.data ?? []).find(
        (entry) => entry.id === account.directoryBankId
      )
    : undefined
  const branch = account.directoryBranchId
    ? (branches?.data?.data ?? []).find(
        (entry) => entry.id === account.directoryBranchId
      )
    : undefined
  const bankName = bank?.name ?? account.institutionName ?? null

  const canManage = context.permissions.includes('banking:write')
  const booksBalance = account.booksBalance ?? account.balance
  const bankBalance = account.bankBalance ?? null
  const accountTypeLabel = account.accountType.toLowerCase().replaceAll('_', ' ')

  return (
    <DetailCard aria-label={`Bank account: ${account.name}`}>
      <DetailCardHeader
        title={account.name}
        meta={
          <Badge variant={account.isActive ? 'success' : 'secondary'}>
            {account.isActive ? 'Active' : 'Archived'}
          </Badge>
        }
        subtitle={
          bankName ? (
            <span className="flex flex-col gap-1.5">
              <span>
                {[accountTypeLabel, account.currency].join(' · ')}
              </span>
              <BankIdentity
                size="sm"
                bankName={bankName}
                shortName={bank?.shortName ?? null}
                logoUrl={bank?.logoUrl ?? null}
                branchName={branch?.name ?? null}
                transitNumber={branch?.transitNumber ?? null}
                routingNumber={branch?.routingNumber ?? null}
                accountNumberLast4={account.accountNumberLast4 ?? null}
              />
              {canManage && account.accountNumberLast4 ? (
                <AccountNumberReveal
                  accountId={account.id}
                  accountNumberLast4={account.accountNumberLast4}
                />
              ) : null}
            </span>
          ) : (
            [
              accountTypeLabel,
              account.currency,
              account.institutionName ?? null,
              account.accountNumberLast4
                ? `•••• ${account.accountNumberLast4}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
          )
        }
        actions={
          canManage ? (
            <>
              {account.isActive ? (
                <>
                  <Link
                    href={`/banking/${account.id}/statements/new`}
                    className={buttonVariants({ variant: 'info', size: 'sm' })}
                  >
                    Import statement
                  </Link>
                  <Link
                    href={`/banking/${account.id}/reconcile`}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Reconcile
                  </Link>
                  <Link
                    href={`/banking/${account.id}/transactions/new`}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Add transaction
                  </Link>
                  {['UNDEPOSITED_FUNDS', 'PETTY_CASH'].includes(
                    account.accountType
                  ) ? (
                    <Link
                      href={`/banking/${account.id}/deposits/new`}
                      className={buttonVariants({
                        variant: 'info',
                        size: 'sm',
                      })}
                    >
                      Record deposit
                    </Link>
                  ) : null}
                </>
              ) : null}
              <Link
                href={`/banking/${account.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Edit
              </Link>
            </>
          ) : null
        }
        closeHref="/banking"
        closeLabel="Close bank account"
      />

      <DetailCardBody>
        <section className="876-card mb-6 grid gap-5 p-5 sm:grid-cols-4">
          <Metric
            label="Books balance"
            value={formatMoney(booksBalance, account.currency)}
          />
          <Metric
            label="Bank balance"
            value={
              bankBalance === null
                ? 'Not reported'
                : formatMoney(bankBalance, account.currency)
            }
          />
          <Metric
            label="Booked transactions"
            value={String(transactions.length)}
          />
          <Metric label="Currency" value={account.currency} />
        </section>

        <div className="mb-6">
          <StatementWorkspace
            accountId={account.id}
            currency={account.currency}
            canManage={canManage && account.isActive}
            initialLines={statementLines.data?.data ?? []}
            initialError={statementLines.error?.message ?? null}
          />
        </div>

        {['UNDEPOSITED_FUNDS', 'PETTY_CASH'].includes(account.accountType) ? (
          <section className="876-card mb-6 overflow-hidden">
            <div className="border-border border-b px-5 py-4">
              <h2 className="font-semibold">Deposits</h2>
            </div>
            {(deposits.data?.data ?? [])
              .filter((deposit) => deposit.sourceAccountId === account.id)
              .map((deposit) => (
                <div
                  key={deposit.id}
                  className="border-border border-b px-5 py-3 text-sm"
                >
                  {formatDate(deposit.depositedAt)} ·{' '}
                  {formatMoney(deposit.amount, account.currency)} ·{' '}
                  {deposit.status}
                </div>
              ))}
          </section>
        ) : null}

        <section className="876-card overflow-hidden">
          <div className="border-border border-b px-5 py-4">
            <h2 className="font-semibold">Recorded cash movements</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Canonical booked cash remains separate from imported statement
              evidence. Matching confirms that the two represent the same money.
            </p>
          </div>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              No booked cash movements recorded.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="font-medium">
                      {transaction.description ??
                        (transaction.type === 'CREDIT' ? 'Credit' : 'Debit')}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDate(transaction.date)}
                      {transaction.reference
                        ? ` · ${transaction.reference}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold tabular-nums ${
                        transaction.type === 'DEBIT' ? 'text-destructive' : ''
                      }`}
                    >
                      {transaction.type === 'DEBIT' ? '-' : '+'}
                      {formatMoney(transaction.amount, account.currency)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                      {transaction.status.toLowerCase()}
                    </p>
                  </div>
                  {transaction.paymentId ? (
                    <Link
                      href={`/payments/${transaction.paymentId}`}
                      className="text-primary text-sm hover:underline"
                    >
                      Payment
                    </Link>
                  ) : canManage ? (
                    <Link
                      href={`/banking/${account.id}/transactions/${transaction.id}/edit`}
                      className="text-primary text-sm hover:underline"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </DetailCardBody>

      <DetailCardIdBar>
        <span className="truncate">{account.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}
