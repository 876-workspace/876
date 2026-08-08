'use client'

import { nowUnixSeconds } from '@876/core/timestamps'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { AdminUserPin } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { KeyRound } from '@876/ui/icons'
import { client } from '@/lib/client'

type Props = {
  userId: string
  pin: AdminUserPin
}

function formatWhen(seconds: number | null) {
  if (seconds === null) return '—'
  return new Date(seconds * 1000).toLocaleString()
}

export function PinSection({ userId, pin }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pinValue, setPinValue] = useState('')

  // `nowUnixSeconds` keeps the clock read behind a function boundary; a bare
  // `Date.now()` here is an impure call during render.
  const isLocked =
    pin.locked_until !== null && pin.locked_until > nowUnixSeconds()

  function handleSet(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const currentPin = pinValue
    startTransition(async () => {
      const result = await client.pin.set(userId, { pin: currentPin })
      if (result.error) setError(result.error.message)
      else {
        setPinValue('')
        router.refresh()
      }
    })
  }

  function handleClear() {
    if (!window.confirm('Clear the PIN for this user?')) return
    setError(null)
    startTransition(async () => {
      const result = await client.pin.clear(userId)
      if (result.error) setError(result.error.message)
      else router.refresh()
    })
  }

  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-[0.8125rem] font-semibold">
        <KeyRound className="text-muted-foreground size-4" />
        Account PIN
      </h2>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[0.8125rem]">Status</span>
          {pin.is_set ? (
            <Badge variant="success">Set</Badge>
          ) : (
            <Badge variant="secondary">Not set</Badge>
          )}
        </div>

        {isLocked && (
          <div>
            <Badge variant="warning">
              Locked until {formatWhen(pin.locked_until)}
            </Badge>
          </div>
        )}

        <div className="text-muted-foreground text-[0.8125rem]">
          Set: {formatWhen(pin.set_at)}
        </div>
        <div className="text-muted-foreground text-[0.8125rem]">
          Last verified: {formatWhen(pin.last_verified_at)}
        </div>

        <form onSubmit={handleSet} className="flex items-center gap-2 pt-1">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            minLength={4}
            maxLength={8}
            placeholder="4–8 digit PIN"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-[0.8125rem] shadow-sm focus-visible:ring-1 focus-visible:outline-none"
            required
          />
          <Button type="submit" size="sm" disabled={isPending}>
            Set
          </Button>
          {pin.is_set && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </form>

        {error && <p className="text-destructive text-[0.8125rem]">{error}</p>}
      </div>
    </div>
  )
}
