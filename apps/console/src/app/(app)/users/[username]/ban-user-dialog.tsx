'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, Lock, ShieldCheck } from '@876/ui/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  displayName: string
  /** Current ban state — drives ban vs. unban mode. */
  banned: boolean
}

export function BanUserDialog({
  open,
  onOpenChange,
  userId,
  displayName,
  banned,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = banned
        ? await client.users.unban(userId)
        : await client.users.ban(userId, {
            reason: reason.trim() || null,
          })
      if (result.error) {
        setError(result.error.message)
        return
      }
      onOpenChange(false)
      setReason('')
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={banned ? 'bg-primary/10' : 'bg-destructive/10'}
          >
            {banned ? (
              <ShieldCheck className="text-primary size-6" />
            ) : (
              <Lock className="text-destructive size-6" />
            )}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {banned ? 'Unban user?' : 'Ban user?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground font-medium">
              {displayName}
            </strong>{' '}
            {banned
              ? 'will be able to sign in again. The recorded ban reason will be cleared.'
              : 'will be blocked from signing in on every method, and all of their active sessions will be ended immediately.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!banned && (
          <div className="grid gap-2">
            <Label htmlFor="ban-reason">Reason (optional, internal)</Label>
            <Textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated Terms of Service violations."
              rows={3}
              disabled={isPending}
            />
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={banned ? 'default' : 'destructive'}
            disabled={isPending}
            onClick={(e) => {
              // Keep the dialog open so we can surface errors / pending state.
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : banned ? (
              <ShieldCheck className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            {banned ? 'Unban user' : 'Ban user'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
