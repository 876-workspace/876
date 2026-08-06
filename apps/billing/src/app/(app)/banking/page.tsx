import { Building2, CircleStackIcon, CreditCard } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { BankAccountsList } from './_components/bank-accounts-list'
import { BankingSummaryCard } from './_components/banking-summary-card'

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
        <BankingSummaryCard
          icon={Building2}
          label="Accounts"
          value={String(accounts.length)}
        />
        <BankingSummaryCard
          icon={CircleStackIcon}
          label="Active"
          value={String(activeAccounts.length)}
        />
        <BankingSummaryCard
          icon={CreditCard}
          label="Currencies"
          value={String(
            new Set(accounts.map((account) => account.currency)).size
          )}
        />
      </div>

      <BankAccountsList accounts={filteredAccounts} />
    </Page>
  )
}
