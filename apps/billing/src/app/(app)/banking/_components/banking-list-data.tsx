import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { service } from '@/lib/service'
import { BankingList } from './banking-list'

function formatAccountType(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ')
}

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function BankingListData() {
  const context = await requirePagePermission('banking:read')
  const accounts = await service.bankAccounts.list(context.tenant.id)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <BankingList
        accounts={accounts.map((account) => ({
          id: account.id,
          name: account.name,
          accountTypeLabel: formatAccountType(account.accountType),
          currency: account.currency,
          balance: formatMoney(account.balance, account.currency),
          isActive: account.isActive,
        }))}
      />
    </div>
  )
}
