'use client'

import { useState, useTransition } from 'react'
import { Button, buttonVariants } from '@876/ui/button'

import { Link } from './link'

export interface SalesReceiptLifecycleActionResult {
  error: string | null
}

export function SalesReceiptLifecycleActions({
  refundHref,
  canRefund,
  canVoid,
  onVoid,
}: {
  refundHref: string
  canRefund: boolean
  canVoid: boolean
  onVoid: () => Promise<SalesReceiptLifecycleActionResult>
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function voidReceipt() {
    if (
      !window.confirm(
        'Void this Sales Receipt? Use void only when the original immediate sale was entered incorrectly.'
      )
    )
      return

    setError(null)
    startTransition(async () => {
      const result = await onVoid()
      if (result.error) setError(result.error)
    })
  }

  if (!canRefund && !canVoid) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error ? (
        <span
          className="text-destructive max-w-56 text-right text-xs"
          role="alert"
        >
          {error}
        </span>
      ) : null}
      {canRefund ? (
        <Link
          href={refundHref}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Refund
        </Link>
      ) : null}
      {canVoid ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={voidReceipt}
        >
          {isPending ? 'Voiding...' : 'Void'}
        </Button>
      ) : null}
    </div>
  )
}
