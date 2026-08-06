import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { CreditCard } from '@876/ui/icons'

import { formatMoney } from '@/lib/format'
import { formatAccountType } from '../_lib/banking-format'

type BankAccountItem = {
  id: string
  name: string
  accountType: string
  currency: string
  balance: bigint
  isActive: boolean
}

export function BankAccountsList({
  accounts,
}: {
  accounts: BankAccountItem[]
}) {
  if (accounts.length === 0) {
    return (
      <div className="876-card px-6 py-14 text-center">
        <p className="font-medium">No bank accounts yet</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          Add a checking account, petty cash, or undeposited funds account to
          begin tracking money movement.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
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
          <p className="text-muted-foreground mt-1 text-xs">Recorded balance</p>
        </Link>
      ))}
    </div>
  )
}
