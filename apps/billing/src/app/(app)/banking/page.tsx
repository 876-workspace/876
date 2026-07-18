import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { Building2, CircleStackIcon, CreditCard } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Banking',
  description: 'Manual financial accounts and transaction balances.',
}

const BANKING_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Bank Accounts' },
  { value: 'active', label: 'Active', headingLabel: 'Active Bank Accounts' },
  {
    value: 'archived',
    label: 'Archived',
    headingLabel: 'Archived Bank Accounts',
  },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function BankingPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  const filterIsActive =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await requirePagePermission('banking:read')
  const accounts = await service.bankAccounts.list(context.tenant.id)

  const filteredAccounts =
    filterIsActive === undefined
      ? accounts
      : accounts.filter((account) => account.isActive === filterIsActive)

  const activeAccounts = accounts.filter((account) => account.isActive)

  return (
    <Page>
      <ResourceToolbar
        title="Banking"
        titleFilter={
          <StatusFilterHeading
            label="Banking"
            value={selectedStatus}
            options={BANKING_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('banking:write') ? 'Add' : undefined
        }
        primaryHref={
          context.permissions.includes('banking:write')
            ? '/banking/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Building2}
          label="Accounts"
          value={String(accounts.length)}
        />
        <SummaryCard
          icon={CircleStackIcon}
          label="Active"
          value={String(activeAccounts.length)}
        />
        <SummaryCard
          icon={CreditCard}
          label="Currencies"
          value={String(
            new Set(accounts.map((account) => account.currency)).size
          )}
        />
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="876-card px-6 py-14 text-center">
          <p className="font-medium">No bank accounts yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Add a checking account, petty cash, or undeposited funds account to
            begin tracking money movement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAccounts.map((account) => (
            <Link
              key={account.id}
              href={`/banking/${account.id}`}
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
                {formatAccountType(account.accountType)} · {account.currency}
              </p>
              <p className="mt-5 text-2xl font-semibold tracking-tight tabular-nums">
                {formatMoney(account.balance, account.currency)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Recorded balance
              </p>
            </Link>
          ))}
        </div>
      )}
    </Page>
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

function formatAccountType(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ')
}
