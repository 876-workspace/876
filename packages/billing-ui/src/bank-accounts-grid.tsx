'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { Building2, CircleStackIcon, CreditCard } from '@876/ui/icons'

/**
 * A deposit account as the finance plane serves it.
 *
 * `balance` is optional because it is not part of the account itself: Billing
 * derives it from that account's bank transactions, which a caller reading the
 * organization-scoped account list does not have. An account with no balance
 * renders its identity without inventing a figure.
 */
export interface BankAccountRow {
  id: string
  name: string
  accountTypeLabel: string
  currency: string
  isActive: boolean
  balance?: string | null
}

export interface BankAccountsGridProps {
  accounts: BankAccountRow[]
  /** Card destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  /** Appended to each href, so a host can preserve its own query state. */
  query?: string
  emptyState?: ReactNode
}

export function BankAccountsGrid({
  accounts,
  baseHref,
  query,
  emptyState,
}: BankAccountsGridProps) {
  const hrefFor = (id: string) =>
    query ? `${baseHref}/${id}?${query}` : `${baseHref}/${id}`

  const activeCount = accounts.filter((account) => account.isActive).length
  const currencyCount = new Set(accounts.map((account) => account.currency))
    .size

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

      {accounts.length === 0 ? (
        (emptyState ?? (
          <div className="876-card px-6 py-14 text-center">
            <p className="font-medium">No bank accounts yet</p>
          </div>
        ))
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
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
              {account.balance == null ? null : (
                <>
                  <p className="mt-5 text-2xl font-semibold tracking-tight tabular-nums">
                    {account.balance}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Recorded balance
                  </p>
                </>
              )}
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
