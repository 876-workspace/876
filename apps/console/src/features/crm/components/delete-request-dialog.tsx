'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { client } from '@/lib/client'

export function DeleteRequestDialog({
  organizationId,
  open,
  onOpenChange,
  requestId,
  requestNumber,
  currentUserId,
}: {
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  requestNumber?: number
  currentUserId?: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)

    const result = await client.requests.delete(organizationId, requestId, {
      deletedBy: currentUserId ?? '',
    })
    if (result.error) {
      toast.error(result.error.message)
      setDeleting(false)
      return
    }

    toast.success(`Request ${requestNumber ? `#${requestNumber}` : ''} deleted`)
    onOpenChange(false)
    router.replace('/support')
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete request</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            {requestNumber ? `request #${requestNumber}` : 'this request'}? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
