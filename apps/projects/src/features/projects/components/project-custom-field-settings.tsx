'use client'

import type { ProjectCustomField } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { projectCustomFieldsClient } from '@/lib/client'

type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'user'
  | 'url'

const FIELD_TYPES: readonly FieldType[] = [
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
]

function keyFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseOptions(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ key: keyFromName(label), label }))
}

export function ProjectCustomFieldSettings({
  fields,
}: {
  fields: readonly ProjectCustomField[]
}) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [optionsText, setOptionsText] = useState('')
  const [required, setRequired] = useState(false)
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editRequired, setEditRequired] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const optionField = fieldType === 'select' || fieldType === 'multi-select'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim() || pending) return
    const resolvedKey = keyFromName(key || label)
    const options = optionField ? parseOptions(optionsText) : undefined
    if (!resolvedKey || (optionField && (!options || options.length === 0))) return

    setPending(true)
    setError(null)
    const result = await projectCustomFieldsClient.create({
      key: resolvedKey,
      label: label.trim(),
      fieldType,
      ...(options ? { options } : {}),
      required,
      description: description.trim() || null,
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }

    setLabel('')
    setKey('')
    setFieldType('text')
    setOptionsText('')
    setRequired(false)
    setDescription('')
    router.refresh()
  }

  function startEdit(field: ProjectCustomField) {
    setEditingId(field.id)
    setEditLabel(field.label)
    setEditRequired(field.required)
    setError(null)
  }

  async function saveEdit(field: ProjectCustomField) {
    if (!editLabel.trim() || pending) return
    setPending(true)
    setError(null)
    const result = await projectCustomFieldsClient.update(field.id, {
      label: editLabel.trim(),
      required: editRequired,
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  async function remove(id: string) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await projectCustomFieldsClient.delete(id)
    setPending(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      {error ? <AppError title="Project fields not saved" error={error} variant="banner" /> : null}

      <form onSubmit={submit} className="876-card max-w-2xl space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Add Project field</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            These fields apply to Projects only and do not appear on work items.
          </p>
        </div>
        <FormRow label="Label" htmlFor="project-field-label" required>
          <Input
            id="project-field-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </FormRow>
        <FormRow label="Key" htmlFor="project-field-key">
          <Input
            id="project-field-key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder={keyFromName(label) || 'auto-generated'}
          />
        </FormRow>
        <FormRow label="Field type" htmlFor="project-field-type" required>
          <NativeSelect
            id="project-field-type"
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value as FieldType)}
            className="w-full"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </FormRow>
        {optionField ? (
          <FormRow label="Options" htmlFor="project-field-options" required>
            <Textarea
              id="project-field-options"
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              rows={4}
              placeholder="One option per line"
            />
          </FormRow>
        ) : null}
        <FormRow label="Description" htmlFor="project-field-description">
          <Textarea
            id="project-field-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
        </FormRow>
        <FormRow label="Required" htmlFor="project-field-required">
          <input
            id="project-field-required"
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
        </FormRow>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="info"
            disabled={!label.trim() || pending || (optionField && !optionsText.trim())}
          >
            {pending ? 'Saving…' : 'Add'}
          </Button>
        </div>
      </form>

      <div className="876-card divide-y overflow-hidden">
        {fields.length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">No Project custom fields yet.</p>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                {editingId === field.id ? (
                  <div className="space-y-3">
                    <FormRow label="Label" htmlFor={`project-field-edit-${field.id}`} required>
                      <Input
                        id={`project-field-edit-${field.id}`}
                        value={editLabel}
                        onChange={(event) => setEditLabel(event.target.value)}
                      />
                    </FormRow>
                    <FormRow label="Required" htmlFor={`project-field-required-${field.id}`}>
                      <input
                        id={`project-field-required-${field.id}`}
                        type="checkbox"
                        checked={editRequired}
                        onChange={(event) => setEditRequired(event.target.checked)}
                      />
                    </FormRow>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="info"
                        size="sm"
                        disabled={!editLabel.trim() || pending}
                        onClick={() => saveEdit(field)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{field.label}</p>
                    <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {field.key} · {field.fieldType}
                      {field.required ? ' · required' : ''}
                    </p>
                    {field.description ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {field.description}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              {editingId === field.id ? null : (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => startEdit(field)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => remove(field.id)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
