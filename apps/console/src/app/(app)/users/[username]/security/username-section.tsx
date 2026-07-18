'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { User } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { users } from '@/lib/client'
import { useUsernameAvailability } from '@/hooks/use-username-availability'

type Props = {
  userId: string
  username: string | null
}

export function UsernameSection({ userId, username }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(username ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const availability = useUsernameAvailability(value, {
    excludeUserId: userId,
    unchangedValue: username,
  })

  const trimmed = value.trim()
  const isUnchanged = trimmed.toLowerCase() === (username ?? '').toLowerCase()
  const canSave =
    !isPending &&
    trimmed.length > 0 &&
    !isUnchanged &&
    availability.status === 'available'

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await users.update(userId, { username: trimmed })
      if (res.error) {
        setError(res.error.message)
      } else {
        setEditing(false)
        router.refresh()
      }
    })
  }

  function handleRemove() {
    if (
      !window.confirm(
        "Clear this user's username? They will be able to choose a new one."
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await users.update(userId, { username: null })
      if (res.error) {
        setError(res.error.message)
      } else {
        setValue('')
        setEditing(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <User className="text-muted-foreground size-4" />
        Username
      </h2>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="username"
              disabled={isPending}
              className="font-mono"
              autoFocus
            />
            <Button size="sm" disabled={!canSave} onClick={handleSave}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setValue(username ?? '')
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
          {availability.status === 'checking' && (
            <p className="text-muted-foreground text-xs">Checking…</p>
          )}
          {availability.status === 'unavailable' && (
            <p className="text-destructive text-xs">{availability.message}</p>
          )}
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <span
            className={cn(
              username ? 'font-mono text-sm' : 'text-muted-foreground text-sm'
            )}
          >
            {username ? `@${username}` : '—'}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            {username !== null && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
