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
import { Button, buttonVariants } from '@876/ui/button'

import { client } from '@/lib/client'

interface Props {
  creditNoteId: string
  status: string
  balanceAmount: string
  canWrite: boolean
  canRefund: boolean
}

export function CreditNoteActions({
  creditNoteId,
  status,
  balanceAmount,
  canWrite,
  canRefund,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  if (!canWrite && !canRefund) return null

  function handleVoid(e: React.MouseEvent) {
    e.preventDefault()
    setVoidError(null)
    startTransition(async () => {
      const result = await client.creditNotes.void(creditNoteId)
      if (result.error) {
        setVoidError(result.error.message)
        return
      }
      setVoidOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'OPEN' && canWrite && BigInt(balanceAmount) > 0n ? (
        <Link
          href={`/credit-notes/${creditNoteId}/apply`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Apply
        </Link>
      ) : null}

      {status === 'OPEN' && canRefund && BigInt(balanceAmount) > 0n ? (
        <Link
          href={`/credit-notes/${creditNoteId}/refund`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Refund
        </Link>
      ) : null}

      {status !== 'VOID' && canWrite ? (
        <Button
          variant="outline"
          onClick={() => setVoidOpen(true)}
          disabled={isPending}
          className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30 hover:bg-destructive/10"
        >
          Void
        </Button>
      ) : null}

      {canWrite ? (
        <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void credit note?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently void the credit note and reverse its
                balance.
                {voidError ? (
                  <span className="text-destructive mt-2 block">
                    {voidError}
                  </span>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleVoid}
                disabled={isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isPending ? 'Voiding…' : 'Void'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}
