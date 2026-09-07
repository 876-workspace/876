'use client'

import { useState, useTransition } from 'react'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

export interface ItemStockAdjustmentParams {
  quantity: number
  note: string | null
}

type AdjustmentResult = {
  error: { message: string } | null
}

export function ItemStockAdjustmentForm({
  currentQuantity,
  allowOutOfStock,
  onAdjust,
  onCancel,
  onSaved,
}: {
  currentQuantity: number
  allowOutOfStock: boolean
  onAdjust: (params: ItemStockAdjustmentParams) => Promise<AdjustmentResult>
  onCancel: () => void
  onSaved: () => void
}) {
  const [quantity, setQuantity] = useState(String(currentQuantity))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsed = Number(quantity)
    if (!Number.isInteger(parsed)) {
      setError('Enter a whole-number stock quantity.')
      return
    }
    if (parsed < 0 && !allowOutOfStock) {
      setError('Stock cannot be below zero while out-of-stock sales are disabled.')
      return
    }

    startTransition(async () => {
      const result = await onAdjust({
        quantity: parsed,
        note: note.trim() || null,
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      onSaved()
    })
  }

  return (
    <form className="max-w-xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="item-stock-quantity">Quantity in stock</Label>
          <Input
            id="item-stock-quantity"
            type="number"
            step="1"
            min={allowOutOfStock ? undefined : 0}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={isPending}
            required
          />
          <p className="text-muted-foreground text-xs">
            Current quantity: {currentQuantity}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-stock-note">Note</Label>
          <Textarea
            id="item-stock-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isPending}
            maxLength={500}
            placeholder="Why is the stock count changing?"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Updating…' : 'Update stock'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
