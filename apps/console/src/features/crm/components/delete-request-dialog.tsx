'use client'

import { AppError } from '@876/ui/app-error'
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
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'

import { PLATFORM_REQUESTS_HREF } from '../request-paths'

type ErrorValue = { code: string; message: string }

export function DeleteRequestDialog({
  organizationId,
  open,
  onOpenChange,
  requestId,
  requestNumber,
  currentUserId,
  returnHref = PLATFORM_REQUESTS_HREF,
}: {
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  requestNumber?: number
  currentUserId?: string
  returnHref?: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)

    const result = await client.requests.delete(organizationId, requestId, {
      deletedBy: currentUserId ?? '',
    })
    if (result.error) {
      setError(result.error)
      setDeleting(false)
      return
    }

    toast.success(`Request ${requestNumber ? `#${requestNumber}` : ''} deleted`)
    onOpenChange(false)
    router.replace(returnHref)
    router.refresh()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete request</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            {requestNumber ? `request #${requestNumber}` : 'this request'}? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <AppError
            title="Request could not be deleted"
            error={error}
            variant="form"
            showCode
          />
        ) : null}
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
