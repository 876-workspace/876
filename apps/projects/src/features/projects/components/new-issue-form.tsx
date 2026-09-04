'use client'

import type {
  CustomField,
  Milestone,
  Project,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { MarkdownEditor } from '@876/ui/markdown-editor'
import { NativeSelect } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'

import { issuesClient } from '@/lib/client'

type Props = {
  workItemTypes: WorkItemType[]
  workflowStates: WorkflowState[]
  projects: Project[]
  milestones: Milestone[]
  customFields: CustomField[]
}

type FieldValue = string | number | boolean | string[] | null

function customFieldOptions(field: CustomField) {
  if (!Array.isArray(field.options)) return []
  return field.options.filter(
    (option): option is { key: string; label: string } =>
      typeof option === 'object' &&
      option !== null &&
      'key' in option &&
      'label' in option &&
      typeof option.key === 'string' &&
      typeof option.label === 'string'
  )
}

function initialFieldValue(field: CustomField): FieldValue {
  if (field.fieldType === 'boolean') return false
  if (field.fieldType === 'multi-select') return []
  return ''
}

function dateTimestamp(value: string): number | null {
  if (!value) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1000)
}

export function NewIssueForm({
  workItemTypes,
  workflowStates,
  projects,
  milestones,
  customFields,
}: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [typeKey, setTypeKey] = useState(
    workItemTypes.find((type) => type.isDefault)?.key ?? ''
  )
  const [status, setStatus] = useState(
    workflowStates.find((state) => state.isDefault)?.key ?? ''
  )
  const [milestoneId, setMilestoneId] = useState('')
  const [priority, setPriority] = useState<
    'none' | 'low' | 'medium' | 'high' | 'urgent'
  >('none')
  const [values, setValues] = useState<Record<string, FieldValue>>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const selectedWorkItemType = useMemo(
    () => workItemTypes.find((type) => type.key === typeKey) ?? null,
    [workItemTypes, typeKey]
  )
  const availableMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId === projectId),
    [milestones, projectId]
  )
  const applicableFields = useMemo(
    () =>
      customFields.filter(
        (field) =>
          field.typeIds.length === 0 ||
          (selectedWorkItemType !== null &&
            field.typeIds.includes(selectedWorkItemType.id))
      ),
    [customFields, selectedWorkItemType]
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || pending) return

    const requiredMissing = applicableFields.some((field) => {
      if (!field.required) return false
      const value = values[field.id] ?? initialFieldValue(field)
      return (
        value === '' ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
      )
    })
    if (requiredMissing) {
      setError({
        code: 'projects/required-custom-field',
        message: 'Complete all required custom fields.',
      })
      return
    }

    setPending(true)
    setError(null)
    const customFieldValues = applicableFields.flatMap((field) => {
      const value = values[field.id]
      if (
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      )
        return []
      return [{ fieldId: field.id, value }]
    })
    const result = await issuesClient.create({
      title: title.trim(),
      projectId: projectId || undefined,
      description: description.trim() || null,
      typeKey: typeKey || undefined,
      status: status || undefined,
      ...(milestoneId ? { milestoneId } : {}),
      ...(priority !== 'none' ? { priority } : {}),
      ...(customFieldValues.length > 0
        ? { customFields: customFieldValues }
        : {}),
    })
    setPending(false)

    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/create-failed',
        message: result.error?.message ?? 'Something went wrong.',
      })
      return
    }

    router.push(`/issues/${result.data.identifier}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error ? (
        <AppError title="Issue not created" error={error} variant="banner" />
      ) : null}
      <FormRow label="Title" htmlFor="title" required>
        <Input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Fix the login redirect"
          autoFocus
        />
      </FormRow>
      <FormRow label="Description" htmlFor="description">
        <MarkdownEditor
          id="description"
          name="description"
          value={description}
          onValueChange={setDescription}
          placeholder="Describe the issue in Markdown…"
        />
      </FormRow>
      <FormRow label="Project" htmlFor="project">
        <NativeSelect
          id="project"
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value)
            setMilestoneId('')
          }}
          className="w-full"
        >
          <option value="">Triage</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Type" htmlFor="type">
        <NativeSelect
          id="type"
          value={typeKey}
          onChange={(event) => setTypeKey(event.target.value)}
          className="w-full"
        >
          <option value="">Default work item type</option>
          {workItemTypes.map((type) => (
            <option key={type.id} value={type.key}>
              {type.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Status" htmlFor="status">
        <NativeSelect
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full"
        >
          <option value="">Default workflow state</option>
          {workflowStates.map((state) => (
            <option key={state.id} value={state.key}>
              {state.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Milestone" htmlFor="milestone">
        <NativeSelect
          id="milestone"
          value={milestoneId}
          onChange={(event) => setMilestoneId(event.target.value)}
          className="w-full"
          disabled={!projectId}
        >
          <option value="">No milestone</option>
          {availableMilestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Priority" htmlFor="priority">
        <NativeSelect
          id="priority"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as typeof priority)
          }
          className="w-full"
        >
          {['none', 'low', 'medium', 'high', 'urgent'].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      {applicableFields.map((field) => (
        <CustomFieldControl
          key={field.id}
          field={field}
          value={values[field.id] ?? initialFieldValue(field)}
          onChange={(value) =>
            setValues((current) => ({ ...current, [field.id]: value }))
          }
        />
      ))}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={!title.trim() || pending}
        >
          {pending ? 'Creating…' : 'Create issue'}
        </Button>
      </div>
    </form>
  )
}

function CustomFieldControl({
  field,
  value,
  onChange,
}: {
  field: CustomField
  value: FieldValue
  onChange: (value: FieldValue) => void
}) {
  const options = customFieldOptions(field)
  const inputId = `custom-field-${field.id}`
  if (field.fieldType === 'boolean')
    return (
      <FormRow label={field.label} htmlFor={inputId} required={field.required}>
        <input
          id={inputId}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      </FormRow>
    )
  if (field.fieldType === 'select')
    return (
      <FormRow label={field.label} htmlFor={inputId} required={field.required}>
        <NativeSelect
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full"
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
    )
  if (field.fieldType === 'multi-select') {
    const selected = Array.isArray(value) ? value : []
    return (
      <FormRow label={field.label} required={field.required}>
        <div className="space-y-2">
          {options.map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.key)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option.key]
                      : selected.filter((key) => key !== option.key)
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </FormRow>
    )
  }
  const inputType =
    field.fieldType === 'date'
      ? 'date'
      : field.fieldType === 'number' || field.fieldType === 'decimal'
        ? 'number'
        : 'text'
  if (field.fieldType === 'textarea') {
    return (
      <FormRow label={field.label} htmlFor={inputId} required={field.required}>
        <Textarea
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      </FormRow>
    )
  }
  return (
    <FormRow label={field.label} htmlFor={inputId} required={field.required}>
      <Input
        id={inputId}
        type={inputType}
        step={field.fieldType === 'decimal' ? 'any' : undefined}
        value={
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : ''
        }
        onChange={(event) => {
          const raw = event.target.value
          if (field.fieldType === 'date') onChange(dateTimestamp(raw))
          else if (field.fieldType === 'number')
            onChange(raw === '' ? '' : Number(raw))
          else onChange(raw)
        }}
      />
    </FormRow>
  )
}
