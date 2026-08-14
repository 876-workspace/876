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
  orgId: string
  orgName: string
}

export function RestoreOrgDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await client.organizations.restore(orgId)
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
          <AlertDialogTitle>Restore organization?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground font-medium">
              {orgName || 'This organization'}
            </strong>{' '}
            will be taken out of trash and become available again, with its
            members and Billing customer restored.
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
            Restore organization
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
