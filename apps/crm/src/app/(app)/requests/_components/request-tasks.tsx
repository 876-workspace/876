'use client'

import { isEditorContentEmpty } from '@876/editor'
import { Editor, EditorContent, type EditorHandle } from '@876/editor/react'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  ArrowPathIcon,
  Calendar,
  ClipboardList,
  Pencil,
  PlusIcon,
  TrashIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition, type RefObject } from 'react'

import { MemberPicker } from '@/features/directory/components/member-picker'
import type { DirectoryMember } from '@/features/directory/types'
import { client } from '@/lib/client'
import type {
  CrmRequestTask,
  CrmTaskStatus,
  RequestPriority,
} from '@/types/crm'

import {
  formatDueDate,
  fromDateTimeLocal,
  isOverdue,
  toDateTimeLocal,
} from '../_lib/request-format'
import { RequestPriorityBadge } from './request-priority-badge'

export const NEW_TASK_FIELD_ID = 'new-request-task'
const COMPOSER = 'composer'

const OPEN_STATUSES: { value: CrmTaskStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function isSettled(status: CrmTaskStatus) {
  return status === 'DONE' || status === 'CANCELLED'
}

type Draft = {
  title: string
  description: string
  priorityId: string
  assigneeId: string | null
  dueAt: string
}

function emptyDraft(): Draft {
  return {
    title: '',
    description: '',
    priorityId: '',
    assigneeId: null,
    dueAt: '',
  }
}

function draftFrom(task: CrmRequestTask): Draft {
  return {
    title: task.title,
    description: task.description ?? '',
    priorityId: task.priorityId,
    assigneeId: task.assigneeId,
    dueAt: task.dueAt === null ? '' : toDateTimeLocal(task.dueAt),
  }
}

export function RequestTasksSection({
  requestId,
  tasks,
  priorities,
  members = [],
}: {
  requestId: string
  tasks: CrmRequestTask[]
  priorities: RequestPriority[]
  members?: DirectoryMember[]
}) {
  const router = useRouter()
  const composerEditorRef = useRef<EditorHandle>(null)
  const [composerKey, setComposerKey] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [expanded, setExpanded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [isPending, startTransition] = useTransition()

  const memberIndex = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members]
  )

  const { open, settled } = useMemo(() => {
    const byOrder = [...tasks].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt
    )
    return {
      open: byOrder.filter((task) => !isSettled(task.status)),
      settled: byOrder.filter((task) => isSettled(task.status)),
    }
  }, [tasks])

  const doneCount = tasks.filter((task) => task.status === 'DONE').length
  const isSubmitting = busyId === COMPOSER || isPending

  async function addTask(event: React.FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title || isSubmitting) return

    setError(null)
    setBusyId(COMPOSER)
    const description =
      (await composerEditorRef.current?.flush()) ?? draft.description
    const result = await client.requestTasks.create(requestId, {
      title,
      description: isEditorContentEmpty(description) ? null : description,
      ...(draft.priorityId ? { priorityId: draft.priorityId } : {}),
      assigneeId: draft.assigneeId,
      dueAt: fromDateTimeLocal(draft.dueAt),
    })
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return
    }

    setDraft(emptyDraft())
    setComposerKey((current) => current + 1)
    setExpanded(false)
    startTransition(() => router.refresh())
  }

  async function patchTask(
    taskId: string,
    params: Parameters<typeof client.requestTasks.update>[2]
  ) {
    setError(null)
    setBusyId(taskId)
    const result = await client.requestTasks.update(requestId, taskId, params)
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return false
    }

    startTransition(() => router.refresh())
    return true
  }

  async function saveEdit(taskId: string, next: Draft) {
    const title = next.title.trim()
    if (!title) return

    const saved = await patchTask(taskId, {
      title,
      description: isEditorContentEmpty(next.description)
        ? null
        : next.description,
      ...(next.priorityId ? { priorityId: next.priorityId } : {}),
      assigneeId: next.assigneeId,
      dueAt: fromDateTimeLocal(next.dueAt),
    })
    if (saved) setEditingId(null)
  }

  async function deleteTask(taskId: string) {
    setError(null)
    setBusyId(taskId)
    const result = await client.requestTasks.delete(requestId, taskId)
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardList
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
        <h2 className="876-section-title">Tasks</h2>
        <Badge variant="secondary" className="px-1.5 tabular-nums">
          {tasks.length}
        </Badge>
        {tasks.length > 0 ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {doneCount} of {tasks.length} done
          </span>
        ) : null}
      </div>

      {error ? (
        <AppError
          title="Task change could not be saved"
          error={error}
          variant="form"
        />
      ) : null}

      {tasks.length === 0 ? (
        <p className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          No tasks on this request yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...open, ...settled].map((task) => (
            <li key={task.id}>
              <TaskRow
                task={task}
                priorities={priorities}
                assignee={
                  task.assigneeId ? memberIndex.get(task.assigneeId) : undefined
                }
                members={members}
                busy={busyId === task.id || isPending}
                editing={editingId === task.id}
                onEdit={() => setEditingId(task.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(next) => saveEdit(task.id, next)}
                onToggleDone={(done) =>
                  patchTask(task.id, { status: done ? 'DONE' : 'OPEN' })
                }
                onStatusChange={(status) => patchTask(task.id, { status })}
                onDelete={() => deleteTask(task.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addTask} className="876-card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={NEW_TASK_FIELD_ID}
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            onFocus={() => setExpanded(true)}
            placeholder="Add a task…"
            className="min-w-48 flex-1"
            disabled={isSubmitting}
            aria-label="New task"
          />
          <Button
            type="submit"
            variant="info"
            size="sm"
            disabled={isSubmitting || !draft.title.trim()}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <ArrowPathIcon
                className="size-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <PlusIcon className="size-3.5" aria-hidden="true" />
            )}
            {isSubmitting ? 'Adding' : 'Add task'}
          </Button>
        </div>

        {expanded ? (
          <TaskFields
            draft={draft}
            priorities={priorities}
            members={members}
            disabled={isSubmitting}
            idPrefix="new-task"
            editorRef={composerEditorRef}
            editorKey={composerKey}
            onChange={setDraft}
          />
        ) : null}
      </form>
    </section>
  )
}

function TaskFields({
  draft,
  priorities,
  members,
  disabled,
  idPrefix,
  editorRef,
  editorKey,
  onChange,
}: {
  draft: Draft
  priorities: RequestPriority[]
  members: DirectoryMember[]
  disabled: boolean
  idPrefix: string
  editorRef: RefObject<EditorHandle | null>
  editorKey: string | number
  onChange: (next: Draft) => void
}) {
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    onChange({ ...draft, [key]: value })
  }

  const availablePriorities = priorities.filter(
    (priority) => priority.isActive || priority.id === draft.priorityId
  )
  const defaultPriority = priorities.find((priority) => priority.isDefault)

  return (
    <div className="flex flex-col gap-3">
      <Editor
        key={editorKey}
        ref={editorRef}
        initialValue={draft.description}
        onChange={(value) => set('description', value)}
        placeholder="Details (optional)"
        ariaLabel="Task details"
        disabled={disabled}
        minHeight={90}
        className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 rounded-md border px-3 py-2 focus-within:ring-[3px]"
        holderClassName="min-h-20"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col">
          <label
            htmlFor={`${idPrefix}-priority`}
            className="text-muted-foreground mb-1.5 text-xs font-medium"
          >
            Priority
          </label>
          <NativeSelect
            id={`${idPrefix}-priority`}
            className="w-full"
            value={draft.priorityId}
            onChange={(event) => set('priorityId', event.target.value)}
            disabled={disabled || availablePriorities.length === 0}
          >
            <NativeSelectOption value="">
              Default{defaultPriority ? ` (${defaultPriority.name})` : ''}
            </NativeSelectOption>
            {availablePriorities.map((priority) => (
              <NativeSelectOption key={priority.id} value={priority.id}>
                {priority.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col">
          <label
            htmlFor={`${idPrefix}-due`}
            className="text-muted-foreground mb-1.5 text-xs font-medium"
          >
            Due
          </label>
          <Input
            id={`${idPrefix}-due`}
            type="datetime-local"
            value={draft.dueAt}
            onChange={(event) => set('dueAt', event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col">
          <span className="text-muted-foreground mb-1.5 text-xs font-medium">
            Assignee
          </span>
          <MemberPicker
            members={members}
            value={draft.assigneeId}
            onSelect={(userId) => set('assigneeId', userId)}
            placeholder="Unassigned"
            emptyLabel="No members found."
            allowUnassigned
          />
        </div>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  priorities,
  assignee,
  members,
  busy,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onToggleDone,
  onStatusChange,
  onDelete,
}: {
  task: CrmRequestTask
  priorities: RequestPriority[]
  assignee?: DirectoryMember
  members: DirectoryMember[]
  busy: boolean
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (next: Draft) => void
  onToggleDone: (done: boolean) => void
  onStatusChange: (status: CrmTaskStatus) => void
  onDelete: () => void
}) {
  const editorRef = useRef<EditorHandle>(null)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(task))
  const done = task.status === 'DONE'
  const cancelled = task.status === 'CANCELLED'

  function beginEdit() {
    setDraft(draftFrom(task))
    onEdit()
  }

  async function save() {
    const description = (await editorRef.current?.flush()) ?? draft.description
    const next = { ...draft, description }
    setDraft(next)
    onSave(next)
  }

  if (editing) {
    return (
      <div className="876-card flex flex-col gap-3 p-4">
        <Input
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          disabled={busy}
          autoFocus
          aria-label="Task title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancelEdit()
          }}
        />
        <TaskFields
          draft={draft}
          priorities={priorities}
          members={members}
          disabled={busy}
          idPrefix={`task-${task.id}`}
          editorRef={editorRef}
          editorKey={task.id}
          onChange={setDraft}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={() => void save()}
            disabled={busy || !draft.title.trim()}
          >
            {busy ? 'Saving' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelEdit}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <article className="876-card group flex items-start gap-3 px-4 py-3">
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => onToggleDone(checked === true)}
        disabled={busy}
        className="mt-0.5"
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={beginEdit}
          className={
            done || cancelled
              ? 'text-muted-foreground w-full cursor-text text-left text-sm font-medium line-through'
              : 'text-foreground w-full cursor-text text-left text-sm font-medium'
          }
        >
          {task.title}
        </button>

        {task.description ? (
          <EditorContent
            value={task.description}
            className="text-muted-foreground"
          />
        ) : null}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {task.priority.isDefault ? null : (
            <RequestPriorityBadge priority={task.priority} />
          )}

          {task.dueAt === null ? null : (
            <span
              className={
                isOverdue(task.dueAt) && !done && !cancelled
                  ? 'text-destructive flex items-center gap-1'
                  : 'flex items-center gap-1'
              }
              suppressHydrationWarning
            >
              <Calendar className="size-3.5" aria-hidden="true" />
              {formatDueDate(task.dueAt)}
            </span>
          )}

          {assignee ? (
            <span className="flex items-center gap-1.5">
              <CustomerAvatar
                name={assignee.name}
                src={assignee.avatar}
                className="size-4 rounded-full text-[0.5rem] after:rounded-full [&_[data-slot=avatar-fallback]]:rounded-full [&_[data-slot=avatar-fallback]]:text-[0.5rem] [&_[data-slot=avatar-image]]:rounded-full"
              />
              {assignee.name}
            </span>
          ) : null}

          {task.status === 'IN_PROGRESS' ? (
            <Badge variant="secondary" className="px-1.5 text-[0.6875rem]">
              In progress
            </Badge>
          ) : null}
          {cancelled ? (
            <Badge variant="outline" className="px-1.5 text-[0.6875rem]">
              Cancelled
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {done ? null : (
          <NativeSelect
            size="sm"
            value={task.status}
            onChange={(event) =>
              onStatusChange(event.target.value as CrmTaskStatus)
            }
            disabled={busy}
            aria-label={`Status of ${task.title}`}
          >
            {OPEN_STATUSES.map((status) => (
              <NativeSelectOption key={status.value} value={status.value}>
                {status.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7"
          onClick={beginEdit}
          disabled={busy}
          aria-label={`Edit ${task.title}`}
          title="Edit task"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-7"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Delete ${task.title}`}
          title="Delete task"
        >
          {busy ? (
            <ArrowPathIcon
              className="size-3.5 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <TrashIcon className="size-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </article>
  )
}
