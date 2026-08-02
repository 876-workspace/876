'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type SelectOption = { label: string; value: string }

interface LineState {
  description: string
  quantity: string
  unitAmount: string
}

const RETURN_URL = '/credit-notes'

export function CreditNoteCreateForm({
  customers,
  items,
  currencies,
  defaultCurrency,
}: {
  customers: SelectOption[]
  items: SelectOption[]
  currencies: SelectOption[]
  defaultCurrency: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<LineState[]>([
    { description: '', quantity: '1', unitAmount: '' },
  ])

  function updateLine(index: number, field: keyof LineState, value: string) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    )
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { description: '', quantity: '1', unitAmount: '' },
    ])
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!customerId) {
      setError('Select a customer.')
      return
    }
    if (lines.length === 0) {
      setError('Add at least one line item.')
      return
    }

    // Validate and convert each line's unit amount from major → minor units.
    const parsedLines: {
      description: string
      quantity: number
      unitAmount: string
    }[] = []

    for (const [i, line] of lines.entries()) {
      if (!line.description.trim()) {
        setError(`Line ${i + 1}: enter a description.`)
        return
      }
      const qty = Number(line.quantity)
      if (!Number.isInteger(qty) || qty < 1) {
        setError(`Line ${i + 1}: quantity must be a positive integer.`)
        return
      }
      const rawAmount = line.unitAmount.trim()
      if (!rawAmount) {
        setError(`Line ${i + 1}: enter a unit amount.`)
        return
      }
      const majorFloat = Number(rawAmount)
      if (!Number.isFinite(majorFloat) || majorFloat <= 0) {
        setError(`Line ${i + 1}: unit amount must be a positive number.`)
        return
      }
      // Convert major unit (e.g. 10.00 JMD) → minor units (1000 cents).
      const minorUnits = Math.round(majorFloat * 100)
      parsedLines.push({
        description: line.description.trim(),
        quantity: qty,
        unitAmount: String(minorUnits),
      })
    }

    setError(null)
    startTransition(async () => {
      const result = await client.creditNotes.create({
        customerId,
        currency,
        reason: reason.trim() || undefined,
        lines: parsedLines,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to create credit note.')
        return
      }
      router.push(RETURN_URL)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div className="space-y-4">
        <SelectField
          id="credit-note-customer"
          label="Customer"
          value={customerId}
          options={customers}
          onChange={setCustomerId}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="credit-note-currency"
            label="Currency"
            value={currency}
            options={currencies}
            onChange={setCurrency}
          />
          <div className="space-y-2">
            <Label htmlFor="credit-note-reason">Reason (optional)</Label>
            <Input
              id="credit-note-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Overcharge correction"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Line items</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              disabled={isPending}
            >
              Add line
            </Button>
          </div>

          {lines.map((line, index) => (
            <div key={index} className="876-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Line {index + 1}
                </span>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(index)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive h-auto px-2 py-0.5 text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`credit-note-line-${index}-description`}>
                  Description
                </Label>
                <Input
                  id={`credit-note-line-${index}-description`}
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, 'description', e.target.value)
                  }
                  placeholder="Service rendered / goods returned"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`credit-note-line-${index}-quantity`}>
                    Quantity
                  </Label>
                  <Input
                    id={`credit-note-line-${index}-quantity`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, 'quantity', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`credit-note-line-${index}-amount`}>
                    Unit amount
                  </Label>
                  <Input
                    id={`credit-note-line-${index}-amount`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.unitAmount}
                    onChange={(e) =>
                      updateLine(index, 'unitAmount', e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Credit Note'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(RETURN_URL)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      >
        <NativeSelectOption value="">Select…</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
