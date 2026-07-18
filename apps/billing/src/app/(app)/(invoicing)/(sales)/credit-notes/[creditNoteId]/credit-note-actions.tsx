'use client'

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
import { Button } from '@876/ui/button'
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

interface Props {
  creditNoteId: string
  status: string
  balanceAmount: string
  currency: string
  customerId: string
  canWrite: boolean
}

export function CreditNoteActions({
  creditNoteId,
  status,
  balanceAmount,
  currency,
  customerId,
  canWrite,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Apply dialog state
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyInvoiceId, setApplyInvoiceId] = useState('')
  const [applyAmount, setApplyAmount] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)

  // Refund dialog state
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundError, setRefundError] = useState<string | null>(null)

  // Void alert state
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  if (!canWrite) return null

  function handleApply(e: React.FormEvent) {
    e.preventDefault()
    setApplyError(null)

    if (!applyInvoiceId.trim()) {
      setApplyError('Enter an invoice ID.')
      return
    }

    const majorFloat = Number(applyAmount)
    if (!Number.isFinite(majorFloat) || majorFloat <= 0) {
      setApplyError('Amount must be a positive number.')
      return
    }
    const minorUnits = Math.round(majorFloat * 100)

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

  function handleRefund(e: React.FormEvent) {
    e.preventDefault()
    setRefundError(null)

    const majorFloat = Number(refundAmount)
    if (!Number.isFinite(majorFloat) || majorFloat <= 0) {
      setRefundError('Amount must be a positive number.')
      return
    }
    const minorUnits = Math.round(majorFloat * 100)

    startTransition(async () => {
      const result = await client.refunds.create({
        customerId,
        currency,
        amount: minorUnits,
        creditNoteId,
        refundedAt: Math.floor(Date.now() / 1000),
      })
      if (result.error) {
        setRefundError(result.error.message)
        return
      }
      setRefundOpen(false)
      setRefundAmount('')
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
      {status === 'OPEN' && (
        <>
          <Button
            variant="outline"
            onClick={() => setApplyOpen(true)}
            disabled={isPending}
          >
            Apply
          </Button>

          {Number(balanceAmount) > 0 && (
            <Button
              variant="outline"
              onClick={() => setRefundOpen(true)}
              disabled={isPending}
            >
              Refund
            </Button>
          )}
        </>
      )}

      {status !== 'VOID' && (
        <Button
          variant="outline"
          onClick={() => setVoidOpen(true)}
          disabled={isPending}
          className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30 hover:bg-destructive/10"
        >
          Void
        </Button>
      )}

      {/* Apply Dialog */}
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
              <Label htmlFor="apply-amount">Amount</Label>
              <Input
                id="apply-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
              />
            </div>
            {applyError && (
              <p className="text-destructive text-sm">{applyError}</p>
            )}
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

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund credit note</DialogTitle>
            <DialogDescription>
              Record a cash refund for the remaining credit balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            {refundError && (
              <p className="text-destructive text-sm">{refundError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Refunding…' : 'Refund'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Void Alert Dialog */}
      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void credit note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently void the credit note and reverse its
              balance.
              {voidError && (
                <span className="text-destructive mt-2 block">{voidError}</span>
              )}
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
    </div>
  )
}
