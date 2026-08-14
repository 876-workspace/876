'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, RefreshCw } from '@876/ui/icons'
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

import { client } from '@/lib/client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  displayName: string
}

export function RestoreUserDialog({
  open,
  onOpenChange,
  userId,
  displayName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await client.users.restore(userId)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <RefreshCw className="size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle>Restore user?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground font-medium">
              {displayName}
            </strong>{' '}
            will be taken out of trash and become visible to users again. They
            will need to sign in again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Restore user
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
