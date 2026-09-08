'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'

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
import { Label } from '@876/ui/label'
import { cn } from '@876/ui/lib/utils'
import { Textarea } from '@876/ui/textarea'

export type InvoiceLifecycleStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

export interface InvoiceLifecycleActionResult {
  error: string | null
}

export interface InvoiceLifecycleActionsProps {
  invoiceId: string
  status: InvoiceLifecycleStatus
  editHref?: string
  canEdit?: boolean
  canDelete?: boolean
  onFinalize?: () => Promise<InvoiceLifecycleActionResult>
  onSend?: () => Promise<InvoiceLifecycleActionResult>
  onVoid?: (reason: string | null) => Promise<InvoiceLifecycleActionResult>
  onWriteOff?: (reason: string) => Promise<InvoiceLifecycleActionResult>
  onDelete?: () => Promise<InvoiceLifecycleActionResult>
}

const collectibleStatuses = new Set<InvoiceLifecycleStatus>([
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
])

function canRecordSend(status: InvoiceLifecycleStatus) {
  return collectibleStatuses.has(status) || status === 'PAID'
}

function canVoidFromStatus(status: InvoiceLifecycleStatus) {
  return status === 'OPEN' || status === 'SENT'
}

/** Shared invoice lifecycle action presentation for Billing and Invoice hosts. */
export function InvoiceLifecycleActions({
  status,
  editHref,
  canEdit = false,
  canDelete = false,
  onFinalize,
  onSend,
  onVoid,
  onWriteOff,
  onDelete,
}: InvoiceLifecycleActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [voidOpen, setVoidOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [writeOffReason, setWriteOffReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run(
    action: () => Promise<InvoiceLifecycleActionResult>,
    onSuccess?: () => void
  ) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      onSuccess?.()
    })
  }

  const collectible = collectibleStatuses.has(status)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        Print
      </Button>

      {canEdit && editHref ? (
        <Link
          href={editHref}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          <Pencil className="size-4" />
          Edit
        </Link>
      ) : null}

      {status === 'DRAFT' && onFinalize ? (
        <Button
          type="button"
          disabled={isPending}
          onClick={() => run(onFinalize)}
        >
          {isPending ? 'Finalizing…' : 'Finalize'}
        </Button>
      ) : null}

      {canRecordSend(status) && onSend ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => run(onSend)}
        >
          {isPending ? 'Recording…' : status === 'OPEN' ? 'Mark sent' : 'Send again'}
        </Button>
      ) : null}

      {collectible && onWriteOff ? (
        <AlertDialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
          <AlertDialogTrigger
            render={<Button type="button" variant="outline" disabled={isPending} />}
          >
            Write off
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Write off the remaining balance?</AlertDialogTitle>
              <AlertDialogDescription>
                The remaining receivable will be cleared as uncollectible without
                recording cash or reversing the sale.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invoice-write-off-reason">Reason</Label>
              <Textarea
                id="invoice-write-off-reason"
                value={writeOffReason}
                onChange={(event) => setWriteOffReason(event.target.value)}
                placeholder="Why is this balance being written off?"
                rows={3}
              />
              {error ? (
                <AppError
                  error={{ code: 'invoice/write-off-failed', message: error }}
                  variant="form"
                />
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                disabled={isPending || writeOffReason.trim().length === 0}
                onClick={() =>
                  run(
                    () => onWriteOff(writeOffReason.trim()),
                    () => {
                      setWriteOffOpen(false)
                      setWriteOffReason('')
                    }
                  )
                }
              >
                {isPending ? 'Writing off…' : 'Write off balance'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {canVoidFromStatus(status) && onVoid ? (
        <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
          <AlertDialogTrigger
            render={<Button type="button" variant="destructive" disabled={isPending} />}
          >
            Void
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the remaining receivable and reverses the sale's stock
                movement. The invoice stays in the audit trail.
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
                <AppError
                  error={{ code: 'invoice/void-failed', message: error }}
                  variant="form"
                />
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Keep invoice</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => onVoid(voidReason.trim() || null),
                    () => {
                      setVoidOpen(false)
                      setVoidReason('')
                    }
                  )
                }
              >
                {isPending ? 'Voiding…' : 'Void invoice'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {canDelete && onDelete ? (
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
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => run(onDelete, () => setDeleteOpen(false))}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      {error && !voidOpen && !writeOffOpen && !deleteOpen ? (
        <p
          role="alert"
          className="text-destructive basis-full text-right text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
