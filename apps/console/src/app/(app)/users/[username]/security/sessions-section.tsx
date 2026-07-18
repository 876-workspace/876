'use client'

import { useState, useTransition } from 'react'
import { Button } from '@876/ui/button'
import { LogOut } from '@876/ui/icons'
import { users } from '@/lib/client'

type Props = {
  userId: string
}

export function SessionsSection({ userId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleRevokeSessions() {
    if (
      !window.confirm(
        'Revoke all active sessions for this user? They will be signed out from all devices immediately.'
      )
    ) {
      return
    }
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await users.revokeSessions(userId)
      if (result.error) {
        setError(result.error.message)
      } else {
        const count = result.data?.sessions_revoked ?? 0
        setSuccess(
          `${count} session${count === 1 ? '' : 's'} revoked successfully.`
        )
        setTimeout(() => setSuccess(null), 5000)
      }
    })
  }

  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <LogOut className="text-muted-foreground size-4" />
        Active Sessions
      </h2>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm">Force logout this user from all devices</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Invalidates all active sessions and refresh tokens immediately.
            Suspension alone does not sign the user out — use this alongside a
            status change when needed.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleRevokeSessions}
        >
          Revoke all sessions
        </Button>
      </div>
      {(error || success) && (
        <div className="mt-4 text-sm">
          {error && <p className="text-destructive">{error}</p>}
          {success && (
            <p className="text-emerald-600 dark:text-emerald-400">{success}</p>
          )}
        </div>
      )}
    </div>
  )
}
