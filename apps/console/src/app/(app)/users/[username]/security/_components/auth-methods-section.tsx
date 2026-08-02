'use client'

import { useState, useTransition } from 'react'
import type { AdminAccount } from '@876/admin'
import { Button } from '@876/ui/button'
import { Trash, Lock, KeyRound } from '@876/ui/icons'
import { PROVIDER_ICONS } from '@876/ui/auth/provider-icons'
import { users } from '@/lib/client'

type Props = {
  userId: string
  accounts: AdminAccount[]
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  microsoft: 'Microsoft',
  github: 'GitHub',
  gitlab: 'GitLab',
  linkedin: 'LinkedIn',
  slack: 'Slack',
}

function providerLabel(id: string) {
  return PROVIDER_LABELS[id] ?? id
}

export function AuthMethodsSection({ userId, accounts }: Props) {
  const [accountsList, setAccountsList] = useState<AdminAccount[]>(accounts)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleRemove(account: AdminAccount) {
    const label = providerLabel(account.provider_id)
    if (!window.confirm(`Remove ${label} sign-in method for this user?`)) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await users.unlinkAccount(userId, account.id)
      if (result.error) {
        setError(result.error.message)
      } else {
        setAccountsList((prev) => prev.filter((a) => a.id !== account.id))
      }
    })
  }

  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Lock className="text-muted-foreground size-4" />
        Authentication Methods
      </h2>

      {accountsList.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No linked sign-in methods. This user authenticates with email and
          password only.
        </p>
      ) : (
        <ul className="space-y-2">
          {accountsList.map((account) => {
            const Logo =
              PROVIDER_ICONS[account.provider_id as keyof typeof PROVIDER_ICONS]
            return (
              <li
                key={account.id}
                className="flex items-center gap-2 py-1 last:pb-0"
              >
                <span className="border-876-surface-border bg-background flex size-7 shrink-0 items-center justify-center rounded-md border">
                  {Logo ? (
                    <Logo className="size-4" />
                  ) : (
                    <KeyRound className="text-muted-foreground size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {providerLabel(account.provider_id)}
                </span>
                {account.provider_type !== 'credential' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(account)}
                  >
                    <Trash className="text-muted-foreground size-3.5" />
                    Remove
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
    </div>
  )
}
