'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'

interface InitialMode {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  isSystem: boolean
}

export function PaymentModeForm({ initial }: { initial?: InitialMode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a payment mode name.')
      return
    }

    startTransition(async () => {
      const result = initial
        ? await client.paymentModes.update(initial.id, {
            ...(!initial.isSystem && { name }),
            isDefault,
            isActive,
          })
        : await client.paymentModes.create({ name, isDefault })
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push('/settings/payment-modes')
      router.refresh()
    })
  }

  function remove() {
    if (!initial || !window.confirm('Delete this unused payment mode?')) return

    startTransition(async () => {
      const result = await client.paymentModes.delete(initial.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push('/settings/payment-modes')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <div className="876-card space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="payment-mode-name">Name</Label>
          <Input
            id="payment-mode-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={initial?.isSystem}
            placeholder="Check"
            required
          />
        </div>
        <label className="border-border flex items-start gap-3 rounded-lg border p-4">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            <span className="block text-sm font-medium">Default mode</span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              Preselect this mode when recording a payment.
            </span>
          </span>
        </label>
        {initial ? (
          <label className="border-border flex items-start gap-3 rounded-lg border p-4">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="block text-sm font-medium">Active</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Archived modes remain on historical payments.
              </span>
            </span>
          </label>
        ) : null}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : initial ? 'Save' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {initial && !initial.isSystem ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={remove}
            className="ml-auto"
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  )
}
