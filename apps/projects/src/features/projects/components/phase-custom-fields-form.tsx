'use client'

import type {
  MilestoneCustomField,
  MilestoneCustomFieldValue,
  SetCustomFieldValueInput,
} from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { phasesClient } from '@/lib/client'

type FieldValue = SetCustomFieldValueInput['value']

function options(field: MilestoneCustomField) {
  if (!Array.isArray(field.options)) return []
  return field.options.flatMap((option) => {
    if (
      typeof option === 'object' &&
      option !== null &&
      'key' in option &&
      'label' in option &&
      typeof option.key === 'string' &&
      typeof option.label === 'string'
    )
      return [{ key: option.key, label: option.label }]
    return []
  })
}

function toDateInput(value: FieldValue) {
  if (typeof value !== 'number' || !value) return ''
  return new Date(value * 1000).toISOString().slice(0, 10)
}

function empty(value: FieldValue) {
  return value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

export function PhaseCustomFieldsForm({
  phaseId,
  fields,
  fieldValues,
  canEdit,
}: {
  phaseId: string
  fields: readonly MilestoneCustomField[]
  fieldValues: readonly MilestoneCustomFieldValue[]
  canEdit: boolean
}) {
  const router = useRouter()
  const initial = useMemo(() => {
    const byField = new Map(fieldValues.map((value) => [value.fieldId, value.value]))
    return Object.fromEntries(
      fields.map((field) => [field.id, byField.get(field.id) ?? null])
    ) as Record<string, FieldValue>
  }, [fields, fieldValues])
  const [values, setValues] = useState<Record<string, FieldValue>>(initial)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  if (fields.length === 0) return null

  const missingRequired = fields.some(
    (field) => field.required && empty(values[field.id] ?? null)
  )

  function set(fieldId: string, value: FieldValue) {
    setSaved(false)
    setValues((current) => ({ ...current, [fieldId]: value }))
  }

  async function save() {
    if (!canEdit || pending || missingRequired) return
    setPending(true)
    setError(null)
    setSaved(false)
    const result = await phasesClient.customFields.set(
      phaseId,
      fields.map((field) => ({
        fieldId: field.id,
        value: values[field.id] ?? null,
      }))
    )
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <section className="876-card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold">Custom fields</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Phase-specific workspace fields.
        </p>
      </div>

      {fields.map((field) => {
        const value = values[field.id] ?? null
        const fieldOptions = options(field)
        const id = `phase-field-${field.id}`

        return (
          <FormRow key={field.id} label={field.label} htmlFor={id} required={field.required}>
            {field.fieldType === 'textarea' ? (
              <Textarea
                id={id}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => set(field.id, event.target.value)}
                rows={3}
                disabled={!canEdit || pending}
              />
            ) : field.fieldType === 'boolean' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  id={id}
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => set(field.id, event.target.checked)}
                  disabled={!canEdit || pending}
                />
                Enabled
              </label>
            ) : field.fieldType === 'select' ? (
              <NativeSelect
                id={id}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => set(field.id, event.target.value || null)}
                disabled={!canEdit || pending}
                className="w-full"
              >
                <option value="">Not set</option>
                {fieldOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            ) : field.fieldType === 'multi-select' ? (
              <div id={id} className="flex flex-wrap gap-x-4 gap-y-2">
                {fieldOptions.map((option) => {
                  const selected = Array.isArray(value) && value.includes(option.key)
                  return (
                    <label key={option.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!canEdit || pending}
                        onChange={(event) => {
                          const current = Array.isArray(value) ? value : []
                          set(
                            field.id,
                            event.target.checked
                              ? [...current, option.key]
                              : current.filter((key) => key !== option.key)
                          )
                        }}
                      />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            ) : field.fieldType === 'date' ? (
              <Input
                id={id}
                type="date"
                value={toDateInput(value)}
                disabled={!canEdit || pending}
                onChange={(event) =>
                  set(
                    field.id,
                    event.target.value
                      ? Math.floor(
                          new Date(`${event.target.value}T00:00:00Z`).getTime() / 1000
                        )
                      : null
                  )
                }
              />
            ) : field.fieldType === 'number' ? (
              <Input
                id={id}
                type="number"
                value={typeof value === 'number' ? String(value) : ''}
                disabled={!canEdit || pending}
                onChange={(event) =>
                  set(
                    field.id,
                    event.target.value === ''
                      ? null
                      : Number.parseInt(event.target.value, 10)
                  )
                }
              />
            ) : (
              <Input
                id={id}
                type={field.fieldType === 'url' ? 'url' : 'text'}
                value={typeof value === 'string' ? value : ''}
                disabled={!canEdit || pending}
                onChange={(event) => set(field.id, event.target.value)}
              />
            )}
          </FormRow>
        )
      })}

      {missingRequired ? (
        <p className="text-destructive text-xs">Complete all required phase fields.</p>
      ) : null}
      {error ? <AppError title="Custom fields not saved" error={error} variant="banner" /> : null}
      {saved ? <p className="text-muted-foreground text-xs">Saved.</p> : null}
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="button" variant="info" onClick={save} disabled={pending || missingRequired}>
            {pending ? 'Saving…' : 'Save fields'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
