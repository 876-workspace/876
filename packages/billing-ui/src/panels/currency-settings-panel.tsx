'use client'

import { useState, useTransition } from 'react'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { CalculatorIcon, Plus } from '@876/ui/icons'
import { Input } from '@876/ui/input'

type MutationResult = { error: { message: string } | null }

export interface CurrencySettingsItem {
  code: string
  name: string
  symbol: string | null
  decimalPlaces: number
  isDefault: boolean
  isEnabled: boolean
}

export interface CurrencySettingsPanelProps {
  currencies: CurrencySettingsItem[]
  canManage: boolean
  onEnable: (currency: string) => Promise<MutationResult>
  onDisable: (currency: string) => Promise<MutationResult>
  onSetDefault: (currency: string) => Promise<MutationResult>
  onSuccess: () => void
}

/** Presentation-only currency settings surface shared by Billing and Invoice. */
export function CurrencySettingsPanel({
  currencies,
  canManage,
  onEnable,
  onDisable,
  onSetDefault,
  onSuccess,
}: CurrencySettingsPanelProps) {
  const [currencyCode, setCurrencyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

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
    <section className="space-y-4" aria-label="Currencies">
      <div className="flex items-center justify-between gap-3">
        <h2 className="876-page-title">Currencies</h2>
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
            const code = currencyCode.trim().toUpperCase()
            if (!/^[A-Z]{3}$/.test(code)) {
              setError('Enter a three-letter currency code.')
              return
            }

            run(
              () => onEnable(code),
              () => {
                setCurrencyCode('')
                setShowForm(false)
              }
            )
          }}
        >
          <Input
            aria-label="Currency code"
            value={currencyCode}
            onChange={(event) =>
              setCurrencyCode(event.target.value.toUpperCase())
            }
            placeholder="USD"
            maxLength={3}
            required
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Enable currency'}
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
        {currencies.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalculatorIcon className="text-muted-foreground mx-auto size-6" />
            <p className="mt-3 text-sm font-medium">No currencies enabled</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="876-icon-tile">
                  <CalculatorIcon className="text-876-blue size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {currency.code} · {currency.name}
                    </p>
                    {currency.isDefault ? (
                      <Badge variant="secondary">Base currency</Badge>
                    ) : null}
                    {!currency.isEnabled ? (
                      <Badge variant="outline">Disabled</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {currency.symbol ?? 'No symbol'} · {currency.decimalPlaces}{' '}
                    decimal places
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-1">
                    {!currency.isDefault && currency.isEnabled ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => run(() => onSetDefault(currency.code))}
                      >
                        Make default
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending || currency.isDefault}
                      onClick={() =>
                        run(() =>
                          currency.isEnabled
                            ? onDisable(currency.code)
                            : onEnable(currency.code)
                        )
                      }
                    >
                      {currency.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
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
