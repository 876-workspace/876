'use client'

import type { CustomModuleField } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { customModuleFieldsClient } from '@/lib/client'
import { keyFromName } from '@/lib/custom-modules/module-access'

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'decimal',
  'boolean',
  'date',
  'select',
  'multi-select',
  'user',
  'url',
] as const

function parseOptions(value: string): { key: string; label: string }[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((label) => ({ key: keyFromName(label), label }))
}

export function CustomModuleFieldsManager({
  moduleId,
  initial,
}: {
  moduleId: string
  initial: readonly CustomModuleField[]
}) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [fieldType, setFieldType] = useState<string>('text')
  const [optionsText, setOptionsText] = useState('')
  const [required, setRequired] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const optionField = fieldType === 'select' || fieldType === 'multi-select'

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const resolvedKey = keyFromName(key || label)
    if (!label.trim() || !resolvedKey) return
    const options = optionField ? parseOptions(optionsText) : []

    setPending(true)
    setError(null)
    const result = await customModuleFieldsClient.create(moduleId, {
      key: resolvedKey,
      label: label.trim(),
      fieldType,
      ...(optionField ? { options } : {}),
      required,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/custom-module-field-save-failed',
          message: 'The field could not be created.',
        }
      )
      return
    }

    setLabel('')
    setKey('')
    setOptionsText('')
    setRequired(false)
    router.refresh()
  }

  async function onDelete(fieldId: string) {
    setError(null)
    const result = await customModuleFieldsClient.remove(moduleId, fieldId)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {error ? <AppError title="Fields not saved" error={error} variant="banner" /> : null}
      {initial.length === 0 ? (
        <p className="text-muted-foreground text-sm">No fields yet. Add the first one below.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {[...initial]
            .sort((a, b) => a.position - b.position)
            .map((field) => (
              <li key={field.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{field.label}</p>
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {field.key} · {field.fieldType}
                    {field.required ? ' · required' : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(field.id)}
                  aria-label={`Delete field ${field.label}`}
                >
                  Delete
                </Button>
              </li>
            ))}
        </ul>
      )}
      <form onSubmit={onCreate} className="max-w-2xl space-y-5">
        <h3 className="text-sm font-semibold">New field</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Label" htmlFor="module-field-label" required>
            <Input
              id="module-field-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Severity"
            />
          </FormRow>
          <FormRow label="Key" htmlFor="module-field-key">
            <Input
              id="module-field-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder={keyFromName(label) || 'severity'}
            />
          </FormRow>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="Type" htmlFor="module-field-type">
            <NativeSelect
              id="module-field-type"
              value={fieldType}
              onChange={(event) => setFieldType(event.target.value)}
            >
              {FIELD_TYPES.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {option}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Required" htmlFor="module-field-required">
            <Checkbox
              id="module-field-required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked === true)}
            />
          </FormRow>
        </div>
        {optionField ? (
          <FormRow label="Options" htmlFor="module-field-options" hint="One option per line.">
            <Textarea
              id="module-field-options"
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              rows={4}
              placeholder={'Low\nHigh'}
            />
          </FormRow>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add field'}
        </Button>
      </form>
    </div>
  )
}
