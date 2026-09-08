'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

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
import { MoreHorizontalIcon } from '@876/ui/icons'

export type QuoteLifecycleStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELED'

export type QuoteLifecycleUiAction =
  | 'send'
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'expire'
  | 'delete'
  | 'convert'

export interface QuoteLifecycleActionResult {
  error?: string | null
}

export interface QuoteLifecycleActionsProps {
  status: QuoteLifecycleStatus
  /** Derived from expiresAt so stale DRAFT/SENT rows cannot offer invalid actions. */
  isExpired: boolean
  canWrite: boolean
  canDelete: boolean
  canConvert: boolean
  editHref?: string
  convertedInvoiceHref?: string
  onAction: (
    action: QuoteLifecycleUiAction
  ) => Promise<QuoteLifecycleActionResult | void>
}

/**
 * Shared quote action presentation. Hosts retain authorization, transport,
 * route construction, navigation, and refresh behavior through props.
 */
export function QuoteLifecycleActions({
  status,
  isExpired,
  canWrite,
  canDelete,
  canConvert,
  editHref,
  convertedInvoiceHref,
  onAction,
}: QuoteLifecycleActionsProps) {
  const [pending, startTransition] = useTransition()
  const [confirmation, setConfirmation] = useState<'cancel' | 'delete' | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  const decisionOpen = status === 'DRAFT' || status === 'SENT'
  const mutable = decisionOpen && !isExpired
  const canExpire = canWrite && decisionOpen && isExpired
  const canSend = canWrite && mutable
  const canAccept = canWrite && mutable
  const canDecline = canWrite && mutable && status === 'SENT'
  const canCancel = canWrite && mutable
  const canEdit = Boolean(editHref) && canWrite && mutable && status === 'DRAFT'
  const canDeleteDraft = canDelete && mutable && status === 'DRAFT'
  const canConvertAccepted = canConvert && status === 'ACCEPTED'

  if (
    !convertedInvoiceHref &&
    !canExpire &&
    !canSend &&
    !canAccept &&
    !canDecline &&
    !canCancel &&
    !canEdit &&
    !canDeleteDraft &&
    !canConvertAccepted
  )
    return null

  const run = (action: QuoteLifecycleUiAction) =>
    startTransition(async () => {
      setError(null)
      const result = await onAction(action)
      if (result?.error) {
        setError(result.error)
        return
      }
      setConfirmation(null)
    })

  const primaryAction = canExpire
    ? ('expire' as const)
    : canConvertAccepted && !convertedInvoiceHref
      ? ('convert' as const)
      : status === 'DRAFT' && canSend
        ? ('send' as const)
        : status === 'SENT' && canAccept
          ? ('accept' as const)
          : null

  const primaryLabel =
    primaryAction === 'expire'
      ? 'Mark expired'
      : primaryAction === 'convert'
        ? 'Convert to invoice'
        : primaryAction === 'send'
          ? 'Send'
          : primaryAction === 'accept'
            ? 'Accept'
            : null

  const hasMenuActions =
    canEdit ||
    Boolean(convertedInvoiceHref) ||
    (canConvertAccepted && !convertedInvoiceHref) ||
    canCancel ||
    canDeleteDraft

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        {convertedInvoiceHref ? (
          <Link
            href={convertedInvoiceHref}
            className={buttonVariants({ variant: 'info' })}
          >
            View invoice
          </Link>
        ) : primaryAction && primaryLabel ? (
          <Button
            variant="info"
            disabled={pending}
            onClick={() => run(primaryAction)}
          >
            {pending ? 'Working…' : primaryLabel}
          </Button>
        ) : null}

        {canDecline ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run('decline')}
          >
            Decline
          </Button>
        ) : null}

        {hasMenuActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
              aria-label="More actions"
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && editHref ? (
                <DropdownMenuItem render={<Link href={editHref} />}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {convertedInvoiceHref ? (
                <DropdownMenuItem render={<Link href={convertedInvoiceHref} />}>
                  View invoice
                </DropdownMenuItem>
              ) : canConvertAccepted ? (
                <DropdownMenuItem disabled={pending} onClick={() => run('convert')}>
                  Convert to invoice
                </DropdownMenuItem>
              ) : null}
              {canCancel ? (
                <DropdownMenuItem onClick={() => setConfirmation('cancel')}>
                  Cancel
                </DropdownMenuItem>
              ) : null}
              {canDeleteDraft && (canEdit || canCancel || canConvertAccepted) ? (
                <DropdownMenuSeparator />
              ) : null}
              {canDeleteDraft ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmation('delete')}
                >
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {error && confirmation === null ? (
          <p role="alert" className="text-destructive basis-full text-right text-sm">
            {error}
          </p>
        ) : null}
      </div>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === 'delete' ? 'Delete this quote?' : 'Cancel this quote?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === 'delete'
                ? 'This permanently removes the draft quote.'
                : 'This marks the quote as canceled.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <AppError
              error={{ code: 'quote/action-failed', message: error }}
              variant="form"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => confirmation && run(confirmation)}
            >
              {confirmation === 'delete' ? 'Delete' : 'Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
