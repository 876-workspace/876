'use client'

import { Button } from '@876/ui/button'
import { AppError } from '@876/ui/app-error'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { client } from '@/lib/client'

type SalesOrderAction =
  'edit' | 'confirm' | 'cancel' | 'complete' | 'convertToInvoice'

export function salesOrderActionsForStatus(status: string): SalesOrderAction[] {
  if (status === 'draft') return ['edit', 'confirm', 'cancel']
  if (status === 'confirmed') return ['cancel', 'complete', 'convertToInvoice']
  return []
}

export function SalesOrderActions({
  salesOrderId,
  status,
  canWrite,
}: {
  salesOrderId: string
  status: string
  canWrite: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  )
  if (!canWrite) return null
  const actions = salesOrderActionsForStatus(status)
  const run = async (
    action: 'confirm' | 'cancel' | 'complete' | 'convertToInvoice'
  ) => {
    setError(null)
    startTransition(async () => {
      const result = await client.salesOrders[action](salesOrderId)
      if (result.error) {
        setError({
          code: result.error.code ?? 'billing/sales-order-invalid-state',
          message: result.error.message,
        })
        return
      }
      router.refresh()
    })
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.includes('edit') ? (
          <Link
            className="inline-flex h-8 items-center rounded-md border px-3 text-sm"
            href={`/sales-orders/${salesOrderId}/edit`}
          >
            Edit
          </Link>
        ) : null}
        {actions.includes('confirm') ? (
          <Button
            variant="info"
            onClick={() => void run('confirm')}
            disabled={isPending}
          >
            Confirm
          </Button>
        ) : null}
        {actions.includes('cancel') ? (
          <Button
            variant="outline"
            onClick={() => void run('cancel')}
            disabled={isPending}
          >
            Cancel
          </Button>
        ) : null}
        {actions.includes('complete') ? (
          <>
            <Button
              variant="outline"
              onClick={() => void run('complete')}
              disabled={isPending}
            >
              Complete
            </Button>
            <Button
              variant="outline"
              onClick={() => void run('convertToInvoice')}
              disabled={isPending}
            >
              Convert to invoice
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <AppError
          title="Sales Order action failed"
          error={error}
          variant="banner"
        />
      ) : null}
    </div>
  )
}
