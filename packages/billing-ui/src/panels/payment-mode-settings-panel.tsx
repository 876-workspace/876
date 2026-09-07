'use client'

import { useState, useTransition } from 'react'

import type {
  PaymentMode,
  PaymentModeCreateParams,
  PaymentModeUpdateParams,
} from '@876/billing'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { CreditCard, Plus, Trash } from '@876/ui/icons'
import { Input } from '@876/ui/input'

type MutationResult = { error: { message: string } | null }

export interface PaymentModeSettingsPanelProps {
  modes: PaymentMode[]
  canManage: boolean
  onCreate: (params: PaymentModeCreateParams) => Promise<MutationResult>
  onUpdate: (
    id: string,
    params: PaymentModeUpdateParams
  ) => Promise<MutationResult>
  onDelete: (id: string) => Promise<MutationResult>
  canDelete?: (mode: PaymentMode) => boolean
  onSuccess: () => void
}

/** Presentation-only payment-mode settings surface shared by Billing and Invoice. */
export function PaymentModeSettingsPanel({
  modes,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
  canDelete = (mode) => !mode.isSystem && !mode.isDefault,
  onSuccess,
}: PaymentModeSettingsPanelProps) {
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<MutationResult>, done?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error.message)
        return
      }
      done?.()
      onSuccess()
    })
  }

  return (
    <section className="space-y-4" aria-label="Payment modes">
      <div className="flex items-center justify-between gap-3">
        <h2 className="876-page-title">Payment modes</h2>
        {canManage ? (
          <Button
            variant="info"
            disabled={isPending}
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        ) : null}
      </div>
      {showForm ? (
        <form
          className="876-card border-876-blue/25 flex flex-wrap gap-3 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = name.trim()
            if (!trimmed) {
              setError('Enter a payment mode name.')
              return
            }
            run(
              () => onCreate({ name: trimmed }),
              () => {
                setName('')
                setShowForm(false)
              }
            )
          }}
        >
          <Input
            aria-label="Payment mode name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bank transfer"
            required
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Create payment mode'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        </form>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}
      <div className="876-card overflow-hidden">
        {modes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CreditCard className="text-muted-foreground mx-auto size-6" />
            <p className="mt-3 font-medium">No payment modes</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {modes.map((mode) => (
              <div
                key={mode.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="876-icon-tile">
                  <CreditCard className="text-876-blue size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{mode.name}</p>
                    {mode.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {mode.isSystem ? (
                      <Badge variant="outline">Built in</Badge>
                    ) : null}
                    {!mode.isActive ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {mode.isActive
                      ? 'Available when recording payments.'
                      : 'Retained for payment history.'}
                  </p>
                </div>
                {canManage && !mode.isDefault ? (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending || !mode.isActive}
                      onClick={() =>
                        run(() => onUpdate(mode.id, { isDefault: true }))
                      }
                    >
                      Make default
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        run(() =>
                          onUpdate(mode.id, { isActive: !mode.isActive })
                        )
                      }
                    >
                      {mode.isActive ? 'Archive' : 'Restore'}
                    </Button>
                    {canDelete(mode) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => run(() => onDelete(mode.id))}
                      >
                        <Trash className="size-3.5" /> Delete
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
