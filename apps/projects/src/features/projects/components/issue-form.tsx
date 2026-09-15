'use client'

import type {
  CustomField,
  Issue,
  Label,
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

type MemberOption = { userId: string; label: string }

type Props = {
  workItemTypes: WorkItemType[]
  workflowStates: WorkflowState[]
  projects: Project[]
  milestones: Milestone[]
  customFields: CustomField[]
  labels?: Label[]
  members?: MemberOption[]
  issues?: Issue[]
  issue?: Issue
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

function issueFieldValues(issue?: Issue): Record<string, FieldValue> {
  if (!issue) return {}
  return Object.fromEntries(
    issue.customFields.map((field) => [field.fieldId, field.value])
  )
}

function dateTimestamp(value: string): number | null {
  if (!value) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1000)
}

function dateInputValue(timestamp: number | null): string {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function selectedCustomFieldValues(
  fields: CustomField[],
  values: Record<string, FieldValue>,
  includeEmpty: boolean
) {
  return fields.flatMap((field) => {
    const value = values[field.id]
    if (!includeEmpty) {
      if (
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      )
        return []
    }

    return [
      {
        fieldId: field.id,
        value: value === undefined || value === '' ? null : value,
      },
    ]
  })
}

export function NewIssueForm(props: Props) {
  return <IssueForm {...props} />
}

export function EditIssueForm(props: Props & { issue: Issue }) {
  return <IssueForm {...props} issue={props.issue} />
}

function IssueForm({
  workItemTypes,
  workflowStates,
  projects,
  milestones,
  customFields,
  labels = [],
  members = [],
  issues = [],
  issue,
}: Props) {
  const router = useRouter()
  const editing = Boolean(issue)
  const [title, setTitle] = useState(issue?.title ?? '')
  const [description, setDescription] = useState(issue?.description ?? '')
  const [projectId, setProjectId] = useState(issue?.projectId ?? '')
  const [typeKey, setTypeKey] = useState(
    issue?.typeKey ?? workItemTypes.find((type) => type.isDefault)?.key ?? ''
  )
  const [status, setStatus] = useState(
    issue?.status ?? workflowStates.find((state) => state.isDefault)?.key ?? ''
  )
  const [milestoneId, setMilestoneId] = useState(issue?.milestone?.id ?? '')
  const [priority, setPriority] = useState<
    'none' | 'low' | 'medium' | 'high' | 'urgent'
  >(issue?.priority ?? 'none')
  const [assigneeUserId, setAssigneeUserId] = useState(
    issue?.assigneeUserId ?? ''
  )
  const [parentIssueId, setParentIssueId] = useState(issue?.parentIssueId ?? '')
  const [estimate, setEstimate] = useState(
    issue?.estimate === null || issue?.estimate === undefined
      ? ''
      : String(issue.estimate)
  )
  const [dueDate, setDueDate] = useState(dateInputValue(issue?.dueDate ?? null))
  const [labelIds, setLabelIds] = useState<string[]>(
    issue?.labels.map((label) => label.id) ?? []
  )
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    issueFieldValues(issue)
  )
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
  const parentOptions = useMemo(
    () =>
      issues.filter(
        (candidate) =>
          candidate.id !== issue?.id &&
          (!projectId || candidate.projectId === projectId)
      ),
    [issue?.id, issues, projectId]
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
    const customFieldValues = selectedCustomFieldValues(
      applicableFields,
      values,
      editing
    )
    const parsedEstimate = estimate === '' ? null : Number(estimate)
    const parsedDueDate = dateTimestamp(dueDate)

    const result = issue
      ? await issuesClient.update(issue.identifier, {
          title: title.trim(),
          projectId: projectId || issue.projectId,
          description: description.trim() || null,
          typeKey: typeKey || issue.typeKey,
          status: status || issue.status,
          milestoneId: milestoneId || null,
          priority,
          assigneeUserId: assigneeUserId || null,
          parentIssueId: parentIssueId || null,
          estimate: parsedEstimate,
          dueDate: parsedDueDate,
          labelIds,
          customFields: customFieldValues,
        })
      : await issuesClient.create({
          title: title.trim(),
          projectId: projectId || undefined,
          description: description.trim() || null,
          typeKey: typeKey || undefined,
          status: status || undefined,
          ...(milestoneId ? { milestoneId } : {}),
          ...(priority !== 'none' ? { priority } : {}),
          ...(assigneeUserId ? { assigneeUserId } : {}),
          ...(parentIssueId ? { parentIssueId } : {}),
          ...(estimate !== '' ? { estimate: parsedEstimate } : {}),
          ...(dueDate ? { dueDate: parsedDueDate } : {}),
          ...(labelIds.length > 0 ? { labelIds } : {}),
          ...(customFieldValues.length > 0
            ? { customFields: customFieldValues }
            : {}),
        })
    setPending(false)

    if (result.error || !result.data) {
      setError({
        code:
          result.error?.code ??
          (editing ? 'projects/update-failed' : 'projects/create-failed'),
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
        <AppError
          title={editing ? 'Issue not updated' : 'Issue not created'}
          error={error}
          variant="banner"
        />
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
            setParentIssueId('')
          }}
          className="w-full"
        >
          {!editing ? <option value="">Triage</option> : null}
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
      <FormRow label="Assignee" htmlFor="assignee">
        <NativeSelect
          id="assignee"
          value={assigneeUserId}
          onChange={(event) => setAssigneeUserId(event.target.value)}
          className="w-full"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.label}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Parent" htmlFor="parent">
        <NativeSelect
          id="parent"
          value={parentIssueId}
          onChange={(event) => setParentIssueId(event.target.value)}
          className="w-full"
        >
          <option value="">No parent</option>
          {parentOptions.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.identifier} — {candidate.title}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Estimate" htmlFor="estimate">
        <Input
          id="estimate"
          type="number"
          min={0}
          max={100}
          step={1}
          value={estimate}
          onChange={(event) => setEstimate(event.target.value)}
          placeholder="Points"
        />
      </FormRow>
      <FormRow label="Due date" htmlFor="due-date">
        <Input
          id="due-date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </FormRow>
      {labels.length > 0 ? (
        <FormRow label="Labels">
          <div className="grid gap-2 sm:grid-cols-2">
            {labels.map((label) => (
              <label key={label.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={labelIds.includes(label.id)}
                  onChange={(event) =>
                    setLabelIds((current) =>
                      event.target.checked
                        ? [...current, label.id]
                        : current.filter((id) => id !== label.id)
                    )
                  }
                />
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </label>
            ))}
          </div>
        </FormRow>
      ) : null}
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
          {pending
            ? editing
              ? 'Saving…'
              : 'Creating…'
            : editing
              ? 'Save changes'
              : 'Create issue'}
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
          field.fieldType === 'date' && typeof value === 'number'
            ? dateInputValue(value)
            : typeof value === 'string' || typeof value === 'number'
              ? String(value)
              : ''
        }
        onChange={(event) => {
          const raw = event.target.value
          if (field.fieldType === 'date') onChange(dateTimestamp(raw))
          else if (
            field.fieldType === 'number' ||
            field.fieldType === 'decimal'
          )
            onChange(raw === '' ? '' : Number(raw))
          else onChange(raw)
        }}
      />
    </FormRow>
  )
}
