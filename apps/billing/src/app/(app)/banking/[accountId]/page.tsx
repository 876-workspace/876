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

import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

type Props = { params: Promise<{ accountId: string }> }

export default async function BankAccountPage({ params }: Props) {
  const context = await requirePagePermission('banking:read')
  const { accountId } = await params
  const [account, transactions] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.bankTransactions.list(context.tenant.id, accountId),
  ])
  if (!account) notFound()

  const canManage = context.permissions.includes('banking:write')

  return (
    <DetailCard aria-label={`Bank account: ${account.name}`}>
      <DetailCardHeader
        title={account.name}
        meta={
          <Badge variant={account.isActive ? 'success' : 'secondary'}>
            {account.isActive ? 'Active' : 'Archived'}
          </Badge>
        }
        subtitle={`${account.accountType
          .toLowerCase()
          .replaceAll('_', ' ')} · ${account.currency}`}
        actions={
          canManage ? (
            <>
              {account.isActive ? (
                <Link
                  href={`/banking/${account.id}/transactions/new`}
                  className={buttonVariants({ variant: 'info', size: 'sm' })}
                >
                  Add transaction
                </Link>
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
        <section className="876-card mb-6 grid gap-5 p-5 sm:grid-cols-3">
          <Metric
            label="Recorded balance"
            value={formatMoney(account.balance, account.currency)}
          />
          <Metric label="Transactions" value={String(transactions.length)} />
          <Metric label="Currency" value={account.currency} />
        </section>

        <section className="876-card overflow-hidden">
          <div className="border-border border-b px-5 py-4">
            <h2 className="font-semibold">Transactions</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Manual entries and matched payment deposits, newest first.
            </p>
          </div>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              No transactions recorded.
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
