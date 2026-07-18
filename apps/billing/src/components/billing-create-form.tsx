'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import {} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { request } from '@/lib/client/request'
import type { FormField } from '@/types/form'

type FieldValue = boolean | string

export function CreateForm({
  title,
  endpoint,
  fields,
  returnUrl,
  method = 'POST',
  submitLabel,
  pendingLabel,
}: {
  title: string
  endpoint: string
  fields: FormField[]
  returnUrl: string
  /** HTTP method — `PATCH` reuses this form for edit flows. */
  method?: 'POST' | 'PATCH'
  submitLabel?: string
  pendingLabel?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    initialValues(fields)
  )

  const isEdit = method === 'PATCH'
  const idleLabel = submitLabel ?? `Create ${title}`
  const busyLabel = pendingLabel ?? (isEdit ? 'Saving…' : 'Creating…')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const payload = buildPayload(fields, values)
    startTransition(async () => {
      const result = await request<{ id: string }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      })
      if (result.error || !result.data) {
        const verb = isEdit ? 'update' : 'create'
        setError(
          result.error?.message ?? `Failed to ${verb} ${title.toLowerCase()}.`
        )
        return
      }

      router.push(returnUrl)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="876-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="876-eyebrow">Details</span>
        </div>
        <div className="space-y-4">
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(value) =>
                setValues((current) => ({ ...current, [field.name]: value }))
              }
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="info" type="submit" disabled={isPending}>
          {isPending ? busyLabel : idleLabel}
        </Button>
        {error ? (
          <span className="text-destructive text-sm">{error}</span>
        ) : null}
      </div>
    </form>
  )
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
}) {
  const id = `billing-create-${field.name}`

  if (field.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="border-input text-primary focus-visible:ring-ring/50 mt-0.5 size-4 rounded"
        />
        <span>
          <span className="block text-sm font-medium">{field.label}</span>
          {field.description ? (
            <span className="text-muted-foreground mt-0.5 block text-xs">
              {field.description}
            </span>
          ) : null}
        </span>
      </label>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {field.type === 'select' ? (
        <NativeSelect
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          className="w-full"
        >
          <NativeSelectOption value="">Select…</NativeSelectOption>
          {field.options?.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <Input
          id={id}
          type={field.type === 'money' ? 'number' : field.type}
          min={
            field.type === 'money' || field.type === 'number' ? '0' : undefined
          }
          step={
            field.type === 'money'
              ? '0.01'
              : field.type === 'number'
                ? '1'
                : undefined
          }
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      )}
      {field.description ? (
        <p className="text-muted-foreground text-xs">{field.description}</p>
      ) : null}
    </div>
  )
}

function initialValues(fields: FormField[]): Record<string, FieldValue> {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.initialValue ?? (field.type === 'checkbox' ? false : ''),
    ])
  )
}

function buildPayload(
  fields: FormField[],
  values: Record<string, FieldValue>
): Record<string, unknown> {
  // Pre-compute which paired fields should be dropped because their counterpart
  // is empty. Collect field names that appear in a pairedWith relationship first.
  const pairedDropped = new Set<string>()
  for (const field of fields) {
    if (!field.pairedWith) continue
    const thisValue = values[field.name]
    const thatValue = values[field.pairedWith]
    const thisEmpty =
      field.type === 'checkbox'
        ? false
        : typeof thisValue !== 'string' || thisValue.trim() === ''
    const pairedField = fields.find((f) => f.name === field.pairedWith)
    const thatEmpty =
      pairedField?.type === 'checkbox'
        ? false
        : typeof thatValue !== 'string' || thatValue.trim() === ''
    if (thisEmpty || thatEmpty) {
      pairedDropped.add(field.name)
      pairedDropped.add(field.pairedWith)
    }
  }

  const entries: Array<[string, unknown]> = []

  for (const field of fields) {
    if (pairedDropped.has(field.name)) continue
    const value = values[field.name]
    if (field.type === 'checkbox') {
      entries.push([field.name, value === true])
      continue
    }
    if (typeof value !== 'string' || value.trim() === '') {
      if (field.emptyAsNull) entries.push([field.name, null])
      continue
    }
    if (field.type === 'number') {
      entries.push([field.name, Number(value)])
      continue
    }
    if (field.type === 'money') {
      entries.push([field.name, String(Math.round(Number(value) * 100))])
      continue
    }

    entries.push([field.name, value.trim()])
  }

  return Object.fromEntries(entries)
}
