import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { service } from '@/lib/service'
import { getBilling } from '@/lib/clients/billing'
import { BankingList, type BankAccountRow } from './banking-list'

function formatAccountType(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ')
}

function isPresent(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 *
 * Bank and branch names resolve in one directory call per kind for the whole
 * page — never one request per row. A directory failure degrades to nameless
 * rows rather than failing the list.
 */
export async function BankingListData() {
  const context = await requirePagePermission('banking:read')
  const [accounts, billing] = await Promise.all([
    service.bankAccounts.list(context.tenant.id),
    getBilling(),
  ])

  const bankIds = [
    ...new Set(accounts.map((account) => account.directoryBankId).filter(isPresent)),
  ]
  const branchIds = [
    ...new Set(
      accounts.map((account) => account.directoryBranchId).filter(isPresent)
    ),
  ]

  const [banks, branches] = await Promise.all([
    bankIds.length
      ? billing.bankDirectory.listBanks('JM', { ids: bankIds })
      : null,
    branchIds.length
      ? billing.bankDirectory.listBranchesByIds(branchIds)
      : null,
  ])

  const bankById = new Map(
    (banks?.data?.data ?? []).map((bank) => [bank.id, bank])
  )
  const branchById = new Map(
    (branches?.data?.data ?? []).map((branch) => [branch.id, branch])
  )

  const rows: BankAccountRow[] = accounts.map((account) => {
    const bank = account.directoryBankId
      ? bankById.get(account.directoryBankId)
      : undefined
    const branch = account.directoryBranchId
      ? branchById.get(account.directoryBranchId)
      : undefined
    const bankName = bank?.name ?? account.institutionName ?? null

    return {
      id: account.id,
      name: account.name,
      accountTypeLabel: formatAccountType(account.accountType),
      currency: account.currency,
      balance: formatMoney(account.balance, account.currency),
      isActive: account.isActive,
      bank: bankName
        ? {
            name: bankName,
            shortName: bank?.shortName ?? null,
            logoUrl: bank?.logoUrl ?? null,
            branchName: branch?.name ?? null,
            transitNumber: branch?.transitNumber ?? null,
            accountNumberLast4: account.accountNumberLast4 ?? null,
          }
        : null,
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <BankingList accounts={rows} />
    </div>
  )
}
