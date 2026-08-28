'use client'

import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { RequestPriority } from '@/types/crm'

type ErrorValue = { code: string; message: string }

export function PriorityForm({ priority }: { priority?: RequestPriority }) {
  const router = useRouter()
  const [name, setName] = useState(priority?.name ?? '')
  const [description, setDescription] = useState(priority?.description ?? '')
  const [color, setColor] = useState(priority?.color ?? '')
  const [icon, setIcon] = useState(priority?.icon ?? '')
  const [weight, setWeight] = useState(String(priority?.weight ?? 20))
  const [sortOrder, setSortOrder] = useState(String(priority?.sortOrder ?? 20))
  const [isDefault, setIsDefault] = useState(priority?.isDefault ?? false)
  const [isActive, setIsActive] = useState(priority?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const editing = Boolean(priority)
  const lockedDefault = priority?.isDefault === true

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const normalizedName = name.trim()
    const parsedWeight = Number(weight)
    const parsedSortOrder = Number(sortOrder)
    if (!normalizedName) {
      setValidationError('Name is required.')
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
    setValidationError(null)
    const common = {
      name: normalizedName,
      description: description.trim() || null,
      color: color.trim() || null,
      icon: icon.trim() || null,
      weight: parsedWeight,
      sortOrder: parsedSortOrder,
      isActive: lockedDefault ? true : isActive,
    }

    const result = priority
      ? await client.requestPriorities.update(priority.id, {
          ...common,
          ...(lockedDefault ? {} : { isDefault }),
        })
      : await client.requestPriorities.create({
          ...common,
          isDefault,
        })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    toast.success(editing ? 'Priority saved.' : 'Priority added.')
    router.replace('/settings/priorities')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="876-card max-w-3xl overflow-hidden">
      <div className="space-y-5 p-5">
        <FormRow htmlFor="priority-name" label="Name" required>
          <Input
            id="priority-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
            placeholder="e.g. Critical"
          />
        </FormRow>

        <FormRow htmlFor="priority-description" label="Description">
          <Textarea
            id="priority-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={saving}
            placeholder="When should agents use this priority?"
          />
        </FormRow>

        <FormRow
          htmlFor="priority-color"
          label="Colour"
          hint="Any CSS colour value such as #ef4444. Used by request and task badges."
        >
          <div className="flex items-center gap-3">
            <span
              className="bg-muted size-5 shrink-0 rounded-full border"
              style={color.trim() ? { backgroundColor: color.trim() } : undefined}
              aria-hidden="true"
            />
            <Input
              id="priority-color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={saving}
              placeholder="#ef4444"
            />
          </div>
        </FormRow>

        <FormRow
          htmlFor="priority-icon"
          label="Icon"
          hint="Optional stable icon key for future surfaces."
        >
          <Input
            id="priority-icon"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            disabled={saving}
            placeholder="alert"
          />
        </FormRow>

        <FormRow
          htmlFor="priority-weight"
          label="Severity"
          hint="Higher values represent greater urgency and are safe to use for ranking/reporting."
        >
          <Input
            id="priority-weight"
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
          htmlFor="priority-sort-order"
          label="Sort order"
          hint="Controls display order independently of severity."
        >
          <Input
            id="priority-sort-order"
            type="number"
            min={0}
            max={1_000_000}
            step={1}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            disabled={saving}
          />
        </FormRow>

        <div className="space-y-3 border-t pt-5">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
              disabled={saving || lockedDefault}
            />
            <span>
              <span className="font-medium">Default priority</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Used when a request, category, subcategory, form, or task does not
                choose a more specific priority.
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
                Archived priorities remain on historical records but cannot be
                selected for new work.
              </span>
            </span>
          </label>
        </div>

        {priority?.provisioningKey ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
            Provisioned resource key:{' '}
            <span className="font-mono">{priority.provisioningKey}</span>. Your
            edits are tenant-owned and are preserved when the platform manifest
            is reconciled again.
          </p>
        ) : null}

        {validationError ? (
          <p className="text-destructive text-sm" role="alert">
            {validationError}
          </p>
        ) : null}
        {error ? (
          <AppError
            title={editing ? 'Priority could not be saved' : 'Priority could not be added'}
            error={error}
            variant="form"
          />
        ) : null}
      </div>

      <div className="bg-muted/10 flex justify-end gap-2 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/settings/priorities')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
