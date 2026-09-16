'use client'

import type { InvoiceDraft } from '@876/projects'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useState } from 'react'

import { financeClient } from '@/lib/client/finance'

type Props = {
  projectId: string
  from: number
  to: number
  canInvoice: boolean
  unpricedMinutes: number | null
}

export function InvoiceDraftAction({
  projectId,
  from,
  to,
  canInvoice,
  unpricedMinutes,
}: Props) {
  const [pending, setPending] = useState(false)
  const [draft, setDraft] = useState<InvoiceDraft | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function create() {
    if (pending || !canInvoice) return
    setPending(true)
    setError(null)
    const result = await financeClient.createInvoiceDraft(projectId, {
      from,
      to,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/invoice-draft-failed',
          message: 'The invoice draft could not be created.',
        }
      )
      return
    }
    setDraft(result.data)
  }

  return (
    <div className="876-card space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Invoice handoff</h3>
        <Button
          type="button"
          variant="info"
          disabled={!canInvoice || pending}
          onClick={create}
        >
          {pending ? 'Creating…' : 'Create invoice'}
        </Button>
      </div>
      {!canInvoice ? (
        <p className="text-muted-foreground text-sm">
          Invoicing needs a billable method and a billing customer.
        </p>
      ) : unpricedMinutes !== null && unpricedMinutes > 0 ? (
        <p className="text-muted-foreground text-sm">
          Unpriced time in this period is excluded from the draft.
        </p>
      ) : null}
      {error ? (
        <AppError title="The invoice draft could not be created" error={error} />
      ) : null}
      {draft ? (
        <p role="status" className="text-sm">
          Draft {draft.invoiceId} created for {draft.billedCount} approved{' '}
          {draft.billedCount === 1 ? 'entry' : 'entries'}.
        </p>
      ) : null}
    </div>
  )
}
