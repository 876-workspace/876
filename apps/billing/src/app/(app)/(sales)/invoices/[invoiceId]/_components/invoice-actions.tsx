'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import { AppError } from '@876/ui/app-error'
import { cn } from '@876/ui/lib/utils'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil, Trash } from '@876/ui/icons'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { InvoiceStatus } from '@/types/invoice'

import { getInvoiceEditability } from '../_lib/invoice-editability'

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string
  status: InvoiceStatus
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [voidOpen, setVoidOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function finalizeInvoice() {
    setError(null)
    startTransition(async () => {
      const result = await client.invoices.finalize(invoiceId, {
        autoApplyCredits: true,
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      router.refresh()
    })
  }

  function voidInvoice() {
    setError(null)
    startTransition(async () => {
      const result = await client.invoices.void(invoiceId, {
        reason: voidReason.trim() || null,
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      setVoidOpen(false)
      router.refresh()
    })
  }

  function deleteInvoice() {
    setError(null)
    startTransition(async () => {
      const result = await client.invoices.delete(invoiceId)
      if (result.error) {
        setError(result.error.message)
        return
      }

      setDeleteOpen(false)
      router.push('/invoices')
      router.refresh()
    })
  }

  const editability = getInvoiceEditability(status)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
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

      {status === 'DRAFT' ? (
        <Button type="button" disabled={isPending} onClick={finalizeInvoice}>
          {isPending ? 'Finalizing…' : 'Finalize'}
        </Button>
      ) : null}

      {status === 'DRAFT' && error ? (
        <p
          role="alert"
          className="text-destructive basis-full text-right text-sm"
        >
          {error}
        </p>
      ) : null}

      {status !== 'DRAFT' && status !== 'PAID' && status !== 'VOID' ? (
        <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
          <AlertDialogTrigger
            render={<Button type="button" variant="destructive" />}
          >
            Void
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the remaining receivable from the customer account.
                The invoice is retained for the audit trail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invoice-void-reason">Reason (optional)</Label>
              <Textarea
                id="invoice-void-reason"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder="Why is this invoice being voided?"
                rows={3}
              />
              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Keep invoice
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={voidInvoice}
              >
                {isPending ? 'Voiding…' : 'Void invoice'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {editability.deletable ? (
        <>
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
                <AlertDialogCancel disabled={isPending}>
                  Cancel
                </AlertDialogCancel>
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
      ) : null}
    </div>
  )
}
