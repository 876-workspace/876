'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
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

import { client } from '@/lib/client'

type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELED'

export function QuoteActions({
  quoteId,
  status,
  canWrite,
  canDelete,
  canConvert,
}: {
  quoteId: string
  status: QuoteStatus
  canWrite: boolean
  canDelete: boolean
  canConvert: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmation, setConfirmation] = useState<'cancel' | 'delete' | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  if (!canWrite && !canDelete && !canConvert) return null

  const run = (action: 'send' | 'accept' | 'decline' | 'cancel' | 'delete') =>
    startTransition(async () => {
      setError(null)
      const result =
        action === 'delete'
          ? await client.documents.delete(quoteId, '/api/quotes')
          : await client.documents.transitionQuote(quoteId, action)
      if (result.error) {
        setError(result.error.message)
        return
      }
      if (action === 'delete') router.push('/quotes')
      setConfirmation(null)
      router.refresh()
    })

  const convertToInvoice = () =>
    startTransition(async () => {
      setError(null)
      const result = await client.documents.create({ quoteId })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to convert the quote.')
        return
      }
      router.push(`/invoices/${result.data.id}`)
      router.refresh()
    })

  const primary = canWrite
    ? status === 'DRAFT'
      ? 'send'
      : status === 'SENT'
        ? 'accept'
        : null
    : null
  const hasMenuActions =
    (canWrite && (status === 'DRAFT' || status === 'SENT')) ||
    (canConvert && status === 'ACCEPTED') ||
    (canDelete && status === 'DRAFT')

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        {status === 'ACCEPTED' && canConvert ? (
          <Button variant="info" disabled={pending} onClick={convertToInvoice}>
            {pending ? 'Converting…' : 'Convert to invoice'}
          </Button>
        ) : primary ? (
          <Button variant="info" disabled={pending} onClick={() => run(primary)}>
            {pending ? 'Working…' : primary === 'send' ? 'Send' : 'Accept'}
          </Button>
        ) : null}
        {canWrite && status === 'SENT' ? (
          <Button variant="outline" disabled={pending} onClick={() => run('decline')}>
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
              {canWrite && status === 'DRAFT' ? (
                <DropdownMenuItem render={<Link href={`/quotes/${quoteId}/edit`} />}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canConvert && status === 'ACCEPTED' ? (
                <DropdownMenuItem disabled={pending} onClick={convertToInvoice}>
                  Convert to invoice
                </DropdownMenuItem>
              ) : null}
              {canWrite && (status === 'DRAFT' || status === 'SENT') ? (
                <DropdownMenuItem onClick={() => setConfirmation('cancel')}>
                  Cancel
                </DropdownMenuItem>
              ) : null}
              {canDelete && status === 'DRAFT' ? <DropdownMenuSeparator /> : null}
              {canDelete && status === 'DRAFT' ? (
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
            <AppError error={{ code: 'quote/action-failed', message: error }} variant="form" />
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
