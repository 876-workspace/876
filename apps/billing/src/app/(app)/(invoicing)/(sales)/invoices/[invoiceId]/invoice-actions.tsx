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
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { InvoiceStatus } from '@/types/invoice'

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

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={() => window.print()}>
        Print
      </Button>

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
    </div>
  )
}
