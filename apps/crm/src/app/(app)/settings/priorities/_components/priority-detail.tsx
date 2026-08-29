'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { ChevronDown, XIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import {
  toPriorityColor,
  type PriorityColor,
} from '@/features/priorities/priority-color'
import { PriorityTag } from '@/features/priorities/priority-tag'
import { client } from '@/lib/client'
import type { RequestPriority } from '@/types/crm'

import { PriorityColorPicker } from './priority-color-picker'

type ErrorValue = { code: string; message: string }

type Props = {
  priority: RequestPriority
  onClose: () => void
  className?: string
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function PriorityDetail({ priority, onClose, className }: Props) {
  const router = useRouter()
  const [name, setName] = useState(priority.name)
  const [description, setDescription] = useState(priority.description ?? '')
  const [color, setColor] = useState<PriorityColor>(
    toPriorityColor(priority.color)
  )
  const [weight, setWeight] = useState(String(priority.weight))
  const [sortOrder, setSortOrder] = useState(String(priority.sortOrder))
  const [isDefault, setIsDefault] = useState(priority.isDefault)
  const [isActive, setIsActive] = useState(priority.isActive)

  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const lockedDefault = priority.isDefault

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

    const result = await client.requestPriorities.update(priority.id, {
      name: normalizedName,
      description: description.trim() || null,
      color,
      weight: parsedWeight,
      sortOrder: parsedSortOrder,
      isActive: lockedDefault ? true : isActive,
      ...(lockedDefault ? {} : { isDefault }),
    })

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    toast.success('Priority saved.')
    router.refresh()
  }

  async function toggleActive() {
    if (toggling || lockedDefault) return
    setToggling(true)
    setError(null)

    const result = await client.requestPriorities.update(priority.id, {
      isActive: !priority.isActive,
    })

    setToggling(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setIsActive(!priority.isActive)
    toast.success(
      priority.isActive ? 'Priority archived.' : 'Priority restored.'
    )
    router.refresh()
  }

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <PriorityTag name={name.trim() || priority.name} color={color} />
          {priority.isDefault ? (
            <Badge variant="info" className="text-xs">
              Default
            </Badge>
          ) : null}
          <Badge variant={priority.isActive ? 'success' : 'secondary'}>
            {priority.isActive ? 'Active' : 'Archived'}
          </Badge>
          {priority.provisioningKey ? (
            <Badge variant="secondary" className="text-xs">
              Provisioned
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!lockedDefault ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={toggling || saving}
              onClick={toggleActive}
            >
              {toggling ? 'Saving…' : priority.isActive ? 'Archive' : 'Restore'}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close priority details"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      <form
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <FormRow
            htmlFor="edit-priority-name"
            label="Name"
            required
            className={rowClassName}
          >
            <div className="space-y-1.5">
              <Input
                id="edit-priority-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError(null)
                }}
                disabled={saving}
                aria-invalid={Boolean(nameError)}
                required
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
            htmlFor="edit-priority-description"
            label="Description"
            hint="When should agents use this priority?"
            className={rowClassName}
          >
            <Textarea
              id="edit-priority-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              rows={3}
            />
          </FormRow>

          <div className="space-y-3 border-t pt-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                disabled={saving || lockedDefault}
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
                checked={lockedDefault ? true : isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
                disabled={saving || lockedDefault}
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
                htmlFor="edit-priority-weight"
                label="Severity"
                hint="Higher values represent greater urgency."
                className={rowClassName}
              >
                <Input
                  id="edit-priority-weight"
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
                htmlFor="edit-priority-sort-order"
                label="Sort order"
                hint="Controls display order independently of severity."
                className={rowClassName}
              >
                <Input
                  id="edit-priority-sort-order"
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

          {priority.provisioningKey ? (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
              Provisioned resource key:{' '}
              <span className="font-mono">{priority.provisioningKey}</span>.
              Your edits are preserved across manifest reconciliation.
            </p>
          ) : null}

          {validationError ? (
            <p className="text-destructive text-sm" role="alert">
              {validationError}
            </p>
          ) : null}

          {error ? (
            <AppError
              title="Priority could not be saved"
              error={error}
              variant="form"
            />
          ) : null}
        </div>

        <div className="border-876-surface-border flex shrink-0 items-center justify-between gap-3 border-t px-6 py-4">
          <span className="text-muted-foreground font-mono text-xs">
            {priority.id}
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="info" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
