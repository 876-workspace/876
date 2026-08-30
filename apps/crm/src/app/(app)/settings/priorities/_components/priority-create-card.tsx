'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { ChevronDown, XIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import {
  DEFAULT_PRIORITY_COLOR,
  type PriorityColor,
} from '@/features/priorities/priority-color'
import { PriorityTag } from '@/features/priorities/priority-tag'
import { client } from '@/lib/client'

import { PriorityColorPicker } from './priority-color-picker'

type ErrorValue = { code: string; message: string }

type Props = {
  onClose: () => void
  onSuccess: (newPriorityId: string) => void
  className?: string
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function PriorityCreateCard({ onClose, onSuccess, className }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<PriorityColor>(DEFAULT_PRIORITY_COLOR)
  const [weight, setWeight] = useState('20')
  const [sortOrder, setSortOrder] = useState('20')
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const normalizedName = name.trim()
    const parsedWeight = Number(weight)
    const parsedSortOrder = Number(sortOrder)

    if (!normalizedName) {
      setNameError('Name is required.')
      return
    }
    if (
      !Number.isInteger(parsedWeight) ||
      parsedWeight < 0 ||
      parsedWeight > 1_000_000
    ) {
      setValidationError(
        'Severity weight must be a whole number between 0 and 1,000,000.'
      )
      return
    }
    if (
      !Number.isInteger(parsedSortOrder) ||
      parsedSortOrder < 0 ||
      parsedSortOrder > 1_000_000
    ) {
      setValidationError(
        'Sort order must be a whole number between 0 and 1,000,000.'
      )
      return
    }

    setSaving(true)
    setError(null)
    setNameError(null)
    setValidationError(null)

    const result = await client.requestPriorities.create({
      name: normalizedName,
      description: description.trim() || null,
      color,
      weight: parsedWeight,
      sortOrder: parsedSortOrder,
      isDefault,
      isActive,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    toast.success('Priority created.')
    onSuccess(result.data.id)
  }

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
          <PriorityTag name={name.trim() || 'New priority'} color={color} />
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close priority creation"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <form
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <FormRow
            htmlFor="create-priority-name"
            label="Name"
            required
            className={rowClassName}
          >
            <div className="space-y-1.5">
              <Input
                id="create-priority-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError(null)
                }}
                placeholder="e.g. Critical"
                disabled={saving}
                aria-invalid={Boolean(nameError)}
                required
                autoFocus
              />
              {nameError ? (
                <p className="text-destructive text-xs" role="alert">
                  {nameError}
                </p>
              ) : null}
            </div>
          </FormRow>

          <FormRow label="Colour" className={rowClassName}>
            <PriorityColorPicker
              value={color}
              onChange={setColor}
              disabled={saving}
            />
          </FormRow>

          <FormRow
            htmlFor="create-priority-description"
            label="Description"
            hint="When should agents use this priority?"
            className={rowClassName}
          >
            <Textarea
              id="create-priority-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              rows={3}
              placeholder="When should agents use this priority?"
            />
          </FormRow>

          <div className="space-y-3 border-t pt-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                disabled={saving}
              />
              <span>
                <span className="font-medium">Default priority</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  Used when no specific priority is chosen.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
                disabled={saving}
              />
              <span>
                <span className="font-medium">Active</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  Active priorities can be selected for new requests.
                </span>
              </span>
            </label>
          </div>

          <details className="group border-t pt-4">
            <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              Ordering
            </summary>
            <div className="mt-4 space-y-5">
              <FormRow
                htmlFor="create-priority-weight"
                label="Severity"
                hint="Higher values represent greater urgency."
                className={rowClassName}
              >
                <Input
                  id="create-priority-weight"
                  type="number"
                  min={0}
                  max={1_000_000}
                  step={1}
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  disabled={saving}
                />
              </FormRow>

              <FormRow
                htmlFor="create-priority-sort-order"
                label="Sort order"
                hint="Controls display order independently of severity."
                className={rowClassName}
              >
                <Input
                  id="create-priority-sort-order"
                  type="number"
                  min={0}
                  max={1_000_000}
                  step={1}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  disabled={saving}
                />
              </FormRow>
            </div>
          </details>

          {validationError ? (
            <p className="text-destructive text-sm" role="alert">
              {validationError}
            </p>
          ) : null}

          {error ? (
            <AppError
              title="Priority could not be created"
              error={error}
              variant="form"
            />
          ) : null}
        </div>

        <div className="border-876-surface-border flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" variant="info" disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </section>
  )
}
