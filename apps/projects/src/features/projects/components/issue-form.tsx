'use client'

import type {
  Cycle,
  CustomField,
  Issue,
  Label,
  Milestone,
  Project,
  TaskList,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'
import { LayoutRenderer } from '@876/projects-ui/layouts/layout-renderer'
import type { Layout, LayoutValues } from '@876/projects/layout-rules'
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
import {
  customFieldInputValue,
  descriptorLabel,
  isLayoutRuleError,
  issueLayoutDescriptors,
  issueToLayoutValues,
  layoutDateTimestamp,
  layoutRuleErrorTitle,
  layoutText,
  layoutTextOrNull,
  missingLayoutFields,
  readLayoutFormValues,
} from './layout-form-helpers'

type MemberOption = { userId: string; label: string }

type Props = {
  workItemTypes: WorkItemType[]
  workflowStates: WorkflowState[]
  projects: Project[]
  milestones: Milestone[]
  customFields: CustomField[]
  taskLists?: TaskList[]
  cycles?: Cycle[]
  labels?: Label[]
  members?: MemberOption[]
  issues?: Issue[]
  issue?: Issue
  /** Server-resolved layout; when present the fields render through it. */
  layout?: Layout | null
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
  taskLists = [],
  cycles = [],
  labels = [],
  members = [],
  issues = [],
  issue,
  layout = null,
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
  const [taskListId, setTaskListId] = useState(issue?.taskListId ?? '')
  const [cycleId, setCycleId] = useState(issue?.cycleId ?? '')
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
  const [plannedStart, setPlannedStart] = useState(
    dateInputValue(issue?.plannedStartDate ?? null)
  )
  const [plannedFinish, setPlannedFinish] = useState(
    dateInputValue(issue?.plannedFinishDate ?? null)
  )
  const [plannedDuration, setPlannedDuration] = useState(
    issue?.plannedDurationMinutes === null ||
      issue?.plannedDurationMinutes === undefined
      ? ''
      : String(issue.plannedDurationMinutes)
  )
  const [labelIds, setLabelIds] = useState<string[]>(
    issue?.labels.map((label) => label.id) ?? []
  )
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    issueFieldValues(issue)
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [ruleFields, setRuleFields] = useState<string[]>([])
  const useLayout = layout !== null

  const selectedWorkItemType = useMemo(
    () => workItemTypes.find((type) => type.key === typeKey) ?? null,
    [workItemTypes, typeKey]
  )
  const availableMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId === projectId),
    [milestones, projectId]
  )
  const availableTaskLists = useMemo(
    () => taskLists.filter((taskList) => taskList.projectId === projectId),
    [taskLists, projectId]
  )
  const availableCycles = useMemo(
    () =>
      cycles.filter(
        (cycle) =>
          cycle.status !== 'completed' &&
          (!projectId ||
            cycle.projectId === null ||
            cycle.projectId === projectId)
      ),
    [cycles, projectId]
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

  const layoutDescriptors = useMemo(
    () =>
      issueLayoutDescriptors({
        customFields: applicableFields,
        workflowStates,
        milestones: availableMilestones,
        taskLists: availableTaskLists,
        labels,
        members,
      }),
    [
      applicableFields,
      workflowStates,
      availableMilestones,
      availableTaskLists,
      labels,
      members,
    ]
  )

  const layoutSeed = useMemo<LayoutValues>(() => {
    const seed = issueToLayoutValues(issue)
    if (!issue) {
      seed.state =
        workflowStates.find((state) => state.isDefault)?.key ?? null
      seed.priority = 'none'
    }
    return seed
  }, [issue, workflowStates])

  function reportLayoutRuleError(
    code: string | undefined,
    message: string,
    values: LayoutValues
  ) {
    const missing = missingLayoutFields(layout as Layout, values)
    setRuleFields(missing)
    setError({
      code: code ?? 'projects/layout-required-fields',
      message: `${layoutRuleErrorTitle(code)}${missing.length > 0 ? ` Missing: ${missing.map((field) => descriptorLabel(layoutDescriptors, field)).join(', ')}` : ''} ${message}`.trim(),
    })
  }

  async function onLayoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !layout) return

    const formValues = readLayoutFormValues(event.currentTarget, layout)
    const missing = missingLayoutFields(layout, formValues)
    if (missing.length > 0) {
      setRuleFields(missing)
      setError({
        code: 'projects/layout-required-fields',
        message: `${layoutRuleErrorTitle('projects/layout-required-fields')} Missing: ${missing.map((field) => descriptorLabel(layoutDescriptors, field)).join(', ')}`,
      })
      return
    }

    const formTitle = layoutText(formValues.title)
    if (!formTitle) {
      setRuleFields(['title'])
      setError({
        code: 'projects/layout-required-fields',
        message: `${layoutRuleErrorTitle('projects/layout-required-fields')} Missing: Title`,
      })
      return
    }

    setPending(true)
    setError(null)
    setRuleFields([])

    const fieldById = new Map(
      applicableFields.map((field) => [`cf:${field.key}`, field])
    )
    const layoutCustomFields = [...fieldById.entries()].flatMap(
      ([fieldKey, field]) => {
        const raw = formValues[fieldKey]
        if (
          !editing &&
          (raw === undefined || raw === null || raw === '' ||
            (Array.isArray(raw) && raw.length === 0))
        )
          return []
        return [
          {
            fieldId: field.id,
            value: customFieldInputValue(field.fieldType, raw),
          },
        ]
      }
    )

    const system = {
      title: formTitle,
      description: layoutTextOrNull(formValues.description),
      status: layoutText(formValues.state) || undefined,
      priority: (layoutText(formValues.priority) || 'none') as
        | 'none'
        | 'low'
        | 'medium'
        | 'high'
        | 'urgent',
      assigneeUserId: layoutTextOrNull(formValues.assignee),
      estimate:
        layoutText(formValues.estimate) === ''
          ? null
          : Number(layoutText(formValues.estimate)),
      dueDate: layoutDateTimestamp(
        typeof formValues.dueDate === 'string' ? formValues.dueDate : null
      ),
      plannedStartDate: layoutDateTimestamp(
        typeof formValues.startDate === 'string' ? formValues.startDate : null
      ),
      labelIds: Array.isArray(formValues.labels)
        ? formValues.labels
        : formValues.labels
          ? [formValues.labels]
          : [],
      milestoneId: layoutTextOrNull(formValues.phase),
      taskListId: layoutTextOrNull(formValues.taskList),
    }

    const result = issue
      ? await issuesClient.update(issue.identifier, {
          ...system,
          projectId: projectId || issue.projectId,
          description: system.description,
          typeKey: typeKey || issue.typeKey,
          status: system.status ?? issue.status,
          milestoneId: system.milestoneId,
          parentIssueId: parentIssueId || null,
          ...(cycleId !== (issue.cycleId ?? '')
            ? { cycleId: cycleId || null }
            : {}),
          ...(layoutCustomFields.length > 0
            ? { customFields: layoutCustomFields }
            : {}),
        })
      : await issuesClient.create({
          ...system,
          projectId: projectId || undefined,
          typeKey: typeKey || undefined,
          ...(cycleId ? { cycleId } : {}),
          ...(parentIssueId ? { parentIssueId } : {}),
          ...(system.labelIds.length > 0 ? { labelIds: system.labelIds } : {}),
          ...(layoutCustomFields.length > 0
            ? { customFields: layoutCustomFields }
            : {}),
        })
    setPending(false)

    if (result.error || !result.data) {
      if (isLayoutRuleError(result.error?.code))
        reportLayoutRuleError(
          result.error?.code,
          result.error?.message ?? '',
          formValues
        )
      else
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (useLayout) return onLayoutSubmit(event)
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
          plannedStartDate: dateTimestamp(plannedStart),
          plannedFinishDate: dateTimestamp(plannedFinish),
          plannedDurationMinutes:
            plannedDuration === '' ? null : Number(plannedDuration),
          labelIds,
          customFields: customFieldValues,
          ...(taskListId !== (issue.taskListId ?? '')
            ? { taskListId: taskListId || null }
            : {}),
          ...(cycleId !== (issue.cycleId ?? '')
            ? { cycleId: cycleId || null }
            : {}),
        })
      : await issuesClient.create({
          title: title.trim(),
          projectId: projectId || undefined,
          description: description.trim() || null,
          typeKey: typeKey || undefined,
          status: status || undefined,
          ...(milestoneId ? { milestoneId } : {}),
          ...(taskListId ? { taskListId } : {}),
          ...(cycleId ? { cycleId } : {}),
          ...(priority !== 'none' ? { priority } : {}),
          ...(assigneeUserId ? { assigneeUserId } : {}),
          ...(parentIssueId ? { parentIssueId } : {}),
          ...(estimate !== '' ? { estimate: parsedEstimate } : {}),
          ...(dueDate ? { dueDate: parsedDueDate } : {}),
          ...(plannedStart
            ? { plannedStartDate: dateTimestamp(plannedStart) }
            : {}),
          ...(plannedFinish
            ? { plannedFinishDate: dateTimestamp(plannedFinish) }
            : {}),
          ...(plannedDuration !== ''
            ? { plannedDurationMinutes: Number(plannedDuration) }
            : {}),
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

  if (useLayout && layout) {
    return (
      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        {error ? (
          <AppError
            title={editing ? 'Issue not updated' : 'Issue not created'}
            error={error}
            variant="banner"
          />
        ) : null}
        {ruleFields.length > 0 ? (
          <ul aria-label="Fields to complete" className="text-sm">
            {ruleFields.map((fieldKey) => (
              <li key={fieldKey}>{descriptorLabel(layoutDescriptors, fieldKey)}</li>
            ))}
          </ul>
        ) : null}
        <FormRow label="Project" htmlFor="project">
          <NativeSelect
            id="project"
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value)
              setCycleId('')
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
        <FormRow label="Cycle" htmlFor="cycle">
          <NativeSelect
            id="cycle"
            value={cycleId}
            onChange={(event) => setCycleId(event.target.value)}
            className="w-full"
          >
            <option value="">No cycle</option>
            {availableCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
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
        <LayoutRenderer
          layout={layout}
          fields={layoutDescriptors}
          values={layoutSeed}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="info" disabled={pending}>
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
            setTaskListId('')
            setCycleId('')
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
      <FormRow label="Phase" htmlFor="milestone">
        <NativeSelect
          id="milestone"
          value={milestoneId}
          onChange={(event) => setMilestoneId(event.target.value)}
          className="w-full"
          disabled={!projectId}
        >
          <option value="">No phase</option>
          {availableMilestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Task list" htmlFor="task-list">
        <NativeSelect
          id="task-list"
          value={taskListId}
          onChange={(event) => setTaskListId(event.target.value)}
          className="w-full"
          disabled={!projectId}
        >
          <option value="">No task list</option>
          {availableTaskLists.map((taskList) => (
            <option key={taskList.id} value={taskList.id}>
              {taskList.name}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Cycle" htmlFor="cycle">
        <NativeSelect
          id="cycle"
          value={cycleId}
          onChange={(event) => setCycleId(event.target.value)}
          className="w-full"
        >
          <option value="">No cycle</option>
          {availableCycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Planned start" htmlFor="planned-start">
          <Input
            id="planned-start"
            type="date"
            value={plannedStart}
            onChange={(event) => setPlannedStart(event.target.value)}
          />
        </FormRow>
        <FormRow label="Planned finish" htmlFor="planned-finish">
          <Input
            id="planned-finish"
            type="date"
            value={plannedFinish}
            onChange={(event) => setPlannedFinish(event.target.value)}
          />
        </FormRow>
      </div>
      <FormRow label="Planned duration (minutes)" htmlFor="planned-duration">
        <Input
          id="planned-duration"
          type="number"
          min={0}
          step={1}
          value={plannedDuration}
          onChange={(event) => setPlannedDuration(event.target.value)}
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
