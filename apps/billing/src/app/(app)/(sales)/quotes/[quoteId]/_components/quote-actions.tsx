'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontalIcon } from '@876/ui/icons'
import { Button, buttonVariants } from '@876/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

import { client } from '@/lib/client'
import type { QuoteStatus } from '@/types/quote'

export function QuoteActions({
  quoteId,
  status,
  convertedInvoiceId,
  canWrite,
}: {
  quoteId: string
  status: QuoteStatus
  convertedInvoiceId?: string | null
  canWrite: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmation, setConfirmation] = useState<'cancel' | 'delete' | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  if (!canWrite) return null

  const run = (action: 'send' | 'accept' | 'decline' | 'cancel' | 'delete') =>
    startTransition(async () => {
      setError(null)
      const result =
        action === 'delete'
          ? await client.quotes.delete(quoteId)
          : await client.quotes[action](quoteId)
      if (result.error) return setError(result.error.message)
      if (action === 'delete') router.push('/quotes')
      setConfirmation(null)
      router.refresh()
    })

  const convertToInvoice = () =>
    startTransition(async () => {
      setError(null)
      const result = await client.invoices.create({ quoteId })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to convert the quote.')
        return
      }
      router.push(`/invoices/${result.data.id}`)
      router.refresh()
    })

  const primary =
    status === 'DRAFT' ? 'send' : status === 'SENT' ? 'accept' : null

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      {convertedInvoiceId ? (
        <Link
          href={`/invoices/${convertedInvoiceId}`}
          className={buttonVariants({ variant: 'info' })}
        >
          View invoice
        </Link>
      ) : status === 'ACCEPTED' ? (
        <Button variant="info" disabled={pending} onClick={convertToInvoice}>
          {pending ? 'Converting…' : 'Convert to invoice'}
        </Button>
      ) : primary ? (
        <Button variant="info" disabled={pending} onClick={() => run(primary)}>
          {pending ? 'Working…' : primary === 'send' ? 'Send' : 'Accept'}
        </Button>
      ) : null}
      {status === 'SENT' ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run('decline')}
        >
          Decline
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          aria-label="More actions"
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === 'DRAFT' ? (
            <DropdownMenuItem
              render={<Link href={`/quotes/${quoteId}/edit`} />}
            >
              Edit
            </DropdownMenuItem>
          ) : null}
          {convertedInvoiceId ? (
            <DropdownMenuItem
              render={<Link href={`/invoices/${convertedInvoiceId}`} />}
            >
              View invoice
            </DropdownMenuItem>
          ) : status === 'ACCEPTED' ? (
            <DropdownMenuItem disabled={pending} onClick={convertToInvoice}>
              Convert to invoice
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={status !== 'DRAFT' && status !== 'SENT'}
            title="Only draft or sent quotes can be canceled."
            onClick={() => setConfirmation('cancel')}
          >
            Cancel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status === 'DRAFT' ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmation('delete')}
            >
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && confirmation === null ? (
        <p className="text-destructive basis-full text-right text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === 'delete'
                ? 'Delete this quote?'
                : 'Cancel this quote?'}
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
    </div>
  )
}
