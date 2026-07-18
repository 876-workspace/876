'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@876/admin'
import { Button } from '@876/ui/button'
import { Shield } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { users } from '@/lib/client'
import { statusBadgeClass } from '@/lib/format'
import { BanUserDialog } from '../ban-user-dialog'

type Props = {
  user: AdminUser
}

export function AccountStatusSection({ user }: Props) {
  const router = useRouter()
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const badgeBase =
    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium'

  function handleSuspendToggle() {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    const actionText = nextStatus === 'suspended' ? 'suspend' : 'unsuspend'
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`)) {
      return
    }
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await users.update(user.id, { status: nextStatus })
      if (res.error) {
        setError(res.error.message)
      } else {
        setSuccess(
          `User successfully ${nextStatus === 'suspended' ? 'suspended' : 'unsuspended'}.`
        )
        router.refresh()
        setTimeout(() => setSuccess(null), 3000)
      }
    })
  }

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Shield className="text-muted-foreground size-4" />
        Account Status
      </h2>
      <div className="divide-876-surface-border divide-y">
        {/* Ban/Unban Row */}
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ban Status</span>
              {user.banned && (
                <span className={cn(badgeBase, statusBadgeClass('banned'))}>
                  Banned
                </span>
              )}
            </div>
            {user.banned && user.banned_reason && (
              <p className="text-muted-foreground mt-1 truncate text-xs">
                Reason: {user.banned_reason}
              </p>
            )}
          </div>
          <Button
            variant={user.banned ? 'default' : 'destructive'}
            size="sm"
            onClick={() => setIsBanDialogOpen(true)}
          >
            {user.banned ? 'Unban user' : 'Ban user'}
          </Button>
        </div>

        {/* Suspend/Unsuspend Row */}
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Suspension Status</span>
              {user.status === 'suspended' && (
                <span className={cn(badgeBase, statusBadgeClass('suspended'))}>
                  suspended
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Suspension sets a flag — it does NOT revoke active sessions. A
              separate &quot;Force logout&quot; button is available in the
              Sessions section below.
            </p>
          </div>
          {(user.status === 'active' || user.status === 'suspended') && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleSuspendToggle}
            >
              {user.status === 'active' ? 'Suspend' : 'Unsuspend'}
            </Button>
          )}
        </div>
      </div>
      {(error || success) && (
        <div className="mt-4 text-sm">
          {error && <p className="text-destructive">{error}</p>}
          {success && (
            <p className="text-emerald-600 dark:text-emerald-400">{success}</p>
          )}
        </div>
      )}

      <BanUserDialog
        open={isBanDialogOpen}
        onOpenChange={setIsBanDialogOpen}
        userId={user.id}
        displayName={displayName}
        banned={user.banned}
      />
    </div>
  )
}
