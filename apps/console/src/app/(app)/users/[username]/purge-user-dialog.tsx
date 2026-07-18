'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, Trash } from '@876/ui/icons'
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

export function PurgeUserDialog({
  open,
  onOpenChange,
  userId,
  displayName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await client.users.purge(userId)
      onOpenChange(false)
      router.push('/users')
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash className="text-destructive size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle>Purge user?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground font-medium">
              {displayName}
            </strong>{' '}
            will be permanently erased from the database. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <Trash className="size-4" />
            )}
            Purge user
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
