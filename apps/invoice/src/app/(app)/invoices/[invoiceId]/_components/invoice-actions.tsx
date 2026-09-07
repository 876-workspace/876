'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@876/core/utils'
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
import { AppError } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil, Trash } from '@876/ui/icons'

import { client } from '@/lib/client'

import {
  getInvoiceEditability,
  type InvoiceStatus,
} from '../_lib/invoice-editability'

export function InvoiceActions({
  invoiceId,
  status,
  canWrite,
}: {
  invoiceId: string
  status: InvoiceStatus
  canWrite: boolean
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const editability = getInvoiceEditability(status)

  function deleteInvoice() {
    setError(null)
    startTransition(async () => {
      const result = await client.documents.delete(invoiceId)
      if (result.error) {
        setError(result.error.message)
        return
      }
      setDeleteOpen(false)
      router.push('/invoices')
      router.refresh()
    })
  }

  if (!canWrite) return null

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
        {editability.editable ? (
          <Link
            href={`/invoices/${invoiceId}/edit`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        ) : null}
        {editability.deletable ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' })
              )}
              aria-label="More actions"
              disabled={isPending}
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => window.print()}>
                Print
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft invoice will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <AppError
              error={{ code: 'invoice/delete-failed', message: error }}
              variant="form"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={deleteInvoice}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
