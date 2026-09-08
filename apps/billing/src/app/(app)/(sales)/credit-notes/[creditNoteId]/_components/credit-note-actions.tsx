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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'
import { minorAmountInputStep, parseMinorAmountInput } from '@/lib/format'

interface Props {
  creditNoteId: string
  status: string
  balanceAmount: string
  currency: string
  decimalPlaces: number
  canWrite: boolean
  canRefund: boolean
}

export function CreditNoteActions({
  creditNoteId,
  status,
  balanceAmount,
  currency,
  decimalPlaces,
  canWrite,
  canRefund,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [applyOpen, setApplyOpen] = useState(false)
  const [applyInvoiceId, setApplyInvoiceId] = useState('')
  const [applyAmount, setApplyAmount] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)

  const [voidOpen, setVoidOpen] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  if (!canWrite && !canRefund) return null

  function handleApply(e: React.FormEvent) {
    e.preventDefault()
    setApplyError(null)

    if (!applyInvoiceId.trim()) {
      setApplyError('Enter an invoice ID.')
      return
    }

    const minorUnits = parseMinorAmountInput(applyAmount, decimalPlaces)
    if (!minorUnits) {
      setApplyError('Enter a valid amount greater than zero.')
      return
    }
    if (BigInt(minorUnits) > BigInt(balanceAmount)) {
      setApplyError('Amount cannot exceed the remaining credit balance.')
      return
    }

    startTransition(async () => {
      const result = await client.creditNotes.apply(creditNoteId, {
        allocations: [{ invoiceId: applyInvoiceId.trim(), amount: minorUnits }],
      })
      if (result.error) {
        setApplyError(result.error.message)
        return
      }
      setApplyOpen(false)
      setApplyInvoiceId('')
      setApplyAmount('')
      router.refresh()
    })
  }

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
      {status === 'OPEN' && canWrite ? (
        <Button
          variant="outline"
          onClick={() => setApplyOpen(true)}
          disabled={isPending}
        >
          Apply
        </Button>
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
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply to invoice</DialogTitle>
              <DialogDescription>
                Allocate credit to an open invoice.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apply-invoice-id">Invoice ID</Label>
                <Input
                  id="apply-invoice-id"
                  value={applyInvoiceId}
                  onChange={(e) => setApplyInvoiceId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-amount">Amount ({currency})</Label>
                <Input
                  id="apply-amount"
                  type="number"
                  min={minorAmountInputStep(decimalPlaces)}
                  step={minorAmountInputStep(decimalPlaces)}
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                />
              </div>
              {applyError ? (
                <p className="text-destructive text-sm">{applyError}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplyOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Applying…' : 'Apply'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                  <span className="text-destructive mt-2 block">{voidError}</span>
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
