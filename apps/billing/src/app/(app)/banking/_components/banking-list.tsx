'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Building2, CircleStackIcon, CreditCard } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'

export type BankAccountRow = {
  id: string
  name: string
  accountTypeLabel: string
  currency: string
  balance: string
  isActive: boolean
}

/**
 * The list column for every `/banking` route: the account grid and its summary
 * tiles on their own, and a condensed pane once an account opens beside it.
 *
 * Both forms live here rather than in two components so the column is one
 * element across open and close — that is what lets the shell animate its
 * width instead of remounting a different tree.
 */
export function BankingList({ accounts }: { accounts: BankAccountRow[] }) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record.
  const status = searchParams.get('status')
  const rows =
    status === 'active' || status === 'archived'
      ? accounts.filter((account) => account.isActive === (status === 'active'))
      : accounts

  const hrefFor = (id: string) =>
    query ? `/banking/${id}?${query}` : `/banking/${id}`

  if (selectedId)
    return (
      <ListPane>
        <ListPaneHeader>Bank accounts</ListPaneHeader>
        <ListPaneBody>
          {rows.length === 0 ? (
            <ListPaneEmpty>No bank accounts yet</ListPaneEmpty>
          ) : (
            rows.map((account) => (
              <ListPaneItem
                key={account.id}
                href={hrefFor(account.id)}
                selected={account.id === selectedId}
                label={`View bank account ${account.name}`}
                title={account.name}
                subtitle={`${account.accountTypeLabel} · ${account.currency}`}
                trailing={
                  account.isActive ? (
                    <span className="tabular-nums">{account.balance}</span>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 py-0 text-[0.625rem]"
                    >
                      Archived
                    </Badge>
                  )
                }
              />
            ))
          )}
        </ListPaneBody>
      </ListPane>
    )

  const activeCount = accounts.filter((account) => account.isActive).length
  const currencyCount = new Set(accounts.map((a) => a.currency)).size

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Building2}
          label="Accounts"
          value={String(accounts.length)}
        />
        <SummaryCard
          icon={CircleStackIcon}
          label="Active"
          value={String(activeCount)}
        />
        <SummaryCard
          icon={CreditCard}
          label="Currencies"
          value={String(currencyCount)}
        />
      </div>

      {rows.length === 0 ? (
        <div className="876-card px-6 py-14 text-center">
          <p className="font-medium">No bank accounts yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Add a checking account, petty cash, or undeposited funds account to
            begin tracking money movement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((account) => (
            <Link
              key={account.id}
              href={hrefFor(account.id)}
              className="876-card 876-card-interactive group overflow-hidden p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="876-icon-tile">
                  <CreditCard className="text-876-green size-4" />
                </span>
                <Badge variant={account.isActive ? 'success' : 'secondary'}>
                  {account.isActive ? 'Active' : 'Archived'}
                </Badge>
              </div>
              <p className="mt-6 font-semibold">{account.name}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {account.accountTypeLabel} · {account.currency}
              </p>
              <p className="mt-5 text-2xl font-semibold tracking-tight tabular-nums">
                {account.balance}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Recorded balance
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  return (
    <div className="876-card flex items-center gap-3 p-4">
      <span className="876-icon-tile">
        <Icon className="text-876-blue size-4" />
      </span>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  )
}
