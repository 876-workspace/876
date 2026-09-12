'use client'

import { useState, useTransition } from 'react'
import { Button } from '@876/ui/button'
import { client } from '@/lib/client'

export interface AccountNumberRevealProps {
  accountId: string
  accountNumberLast4: string
}

/**
 * Shows the masked number and discloses the full one on request. The value is
 * held only in this component's state and is never part of the page payload.
 */
export function AccountNumberReveal({
  accountId,
  accountNumberLast4,
}: AccountNumberRevealProps) {
  const [accountNumber, setAccountNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (accountNumber) {
      setAccountNumber(null)
      return
    }

    startTransition(async () => {
      const result = await client.bankAccounts.accountNumber.retrieve(accountId)
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'The account number could not be shown.')
        return
      }

      setError(null)
      setAccountNumber(result.data.accountNumber)
    })
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground">Account number</span>
      <span className="font-mono tabular-nums" aria-live="polite">
        {accountNumber ?? `••••${accountNumberLast4}`}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2"
        onClick={toggle}
        disabled={pending}
      >
        {accountNumber ? 'Hide' : 'Show'}
      </Button>
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </span>
  )
}
