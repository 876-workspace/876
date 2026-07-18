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
  orgId: string
  orgName: string
}

export function PurgeOrgDialog({ open, onOpenChange, orgId, orgName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await client.orgs.purge(orgId)
      onOpenChange(false)
      router.push('/orgs')
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash className="text-destructive size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle>Purge organization?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground font-medium">
              {orgName || 'This organization'}
            </strong>{' '}
            will be permanently erased from the database along with all its
            memberships. This cannot be undone.
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
            Purge organization
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
