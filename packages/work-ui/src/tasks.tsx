import {
  workTaskImportanceSchema,
  type WorkTask,
  type WorkTaskImportance,
  type WorkTaskList as WorkTaskListResource,
} from '@876/work'
import type { FormEvent } from 'react'

import { cn } from '@876/core/utils'

import { WorkTaskList } from './task-list'

export type WorkTaskDraft = {
  title: string
  listId?: string
  description?: string | null
  importance?: WorkTaskImportance
  due?: { at: number; timeZone: string } | null
}

export type WorkTaskEdit = Omit<WorkTaskDraft, 'listId'>

export type WorkTasksProps = {
  taskLists: readonly WorkTaskListResource[]
  tasks: readonly WorkTask[]
  activeListId: string | null
  onSelectList: (listId: string | null) => void
  mutatingTaskId?: string | null
  creatingTask?: boolean
  onCreateTask?: (input: WorkTaskDraft) => boolean | Promise<boolean>
  onUpdateTask?: (
    task: WorkTask,
    input: WorkTaskEdit
  ) => boolean | Promise<boolean>
  onCompleteTask?: (task: WorkTask) => void | Promise<void>
  onCancelTask?: (task: WorkTask) => void | Promise<void>
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void | Promise<void>
  className?: string
}

function label(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase()
}

function dueLabel(task: WorkTask): string | null {
  if (task.dueAt == null) return null
  return new Date(task.dueAt * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function dateTimeLocalValue(unixSeconds: number | null): string {
  if (unixSeconds == null) return ''
  const date = new Date(unixSeconds * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function dueFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return {
    at: Math.floor(date.getTime() / 1000),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }
}

function TaskActionButton({
  task,
  mutatingTaskId,
  label: actionLabel,
  onAction,
}: {
  task: WorkTask
  mutatingTaskId?: string | null
  label: string
  onAction?: (task: WorkTask) => void | Promise<void>
}) {
  if (!onAction) return null
  const pending = mutatingTaskId != null
  const current = mutatingTaskId === task.id
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onAction(task)}
      className="border-876-surface-border hover:bg-muted focus-visible:ring-ring rounded-full border px-2.5 py-1 text-xs font-medium disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
    >
      {current ? 'Saving…' : actionLabel}
    </button>
  )
}

function TaskEditForm({
  task,
  disabled,
  onUpdateTask,
}: {
  task: WorkTask
  disabled: boolean
  onUpdateTask?: WorkTasksProps['onUpdateTask']
}) {
  if (!onUpdateTask || task.status === 'DONE' || task.status === 'CANCELLED')
    return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const importance = workTaskImportanceSchema.safeParse(data.get('importance'))
    if (!title || !importance.success) return

    await onUpdateTask?.(task, {
      title,
      description: String(data.get('description') ?? '').trim() || null,
      importance: importance.data,
      due: dueFromForm(data.get('due')),
    })
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
      <label className="block text-xs font-medium">
        Title
        <input
          name="title"
          defaultValue={task.title}
          maxLength={240}
          required
          disabled={disabled}
          className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Description
        <textarea
          name="description"
          defaultValue={task.description ?? ''}
          maxLength={10_000}
          disabled={disabled}
          rows={2}
          className="border-876-surface-border bg-background mt-1 w-full resize-y rounded-lg border px-2.5 py-2 text-sm"
        />
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium">
          Importance
          <select
            name="importance"
            defaultValue={task.importance}
            disabled={disabled}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
        <label className="block text-xs font-medium">
          Due
          <input
            type="datetime-local"
            name="due"
            defaultValue={dateTimeLocalValue(task.dueAt)}
            disabled={disabled}
            className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2.5 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
      >
        Save changes
      </button>
    </form>
  )
}

function TaskRow({
  task,
  mutatingTaskId,
  onUpdateTask,
  onCompleteTask,
  onCancelTask,
}: {
  task: WorkTask
  mutatingTaskId?: string | null
  onUpdateTask?: WorkTasksProps['onUpdateTask']
  onCompleteTask?: WorkTasksProps['onCompleteTask']
  onCancelTask?: WorkTasksProps['onCancelTask']
}) {
  const due = dueLabel(task)
  const disabled = mutatingTaskId != null
  const active = task.status !== 'DONE' && task.status !== 'CANCELLED'

  return (
    <div className="border-876-surface-border rounded-xl border p-3">
      <details>
        <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md focus-visible:ring-2 focus-visible:outline-none">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {label(task.status)}
            </span>
            {task.importance !== 'NORMAL' ? (
              <span className="text-muted-foreground text-xs">
                {label(task.importance)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-medium">{task.title}</p>
          {due ? (
            <p className="text-muted-foreground mt-1 text-xs">Due {due}</p>
          ) : null}
        </summary>

        <div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-xs">
          <p>Status: {label(task.status)}</p>
          <p>Importance: {label(task.importance)}</p>
          <p>Complete: {task.percentComplete}%</p>
          {task.description ? <p>{task.description}</p> : null}
          {task.recurrenceRuleId ? <p>Repeats</p> : null}
          {task.assignments.length > 0 ? (
            <p>
              {task.assignments.length}{' '}
              {task.assignments.length === 1 ? 'assignment' : 'assignments'}
            </p>
          ) : null}
        </div>

        <TaskEditForm
          task={task}
          disabled={disabled}
          onUpdateTask={onUpdateTask}
        />
      </details>

      {active ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <TaskActionButton
            task={task}
            mutatingTaskId={mutatingTaskId}
            label="Done"
            onAction={onCompleteTask}
          />
          <TaskActionButton
            task={task}
            mutatingTaskId={mutatingTaskId}
            label="Cancel task"
            onAction={onCancelTask}
          />
        </div>
      ) : null}
    </div>
  )
}

function CreateTaskForm({
  activeListId,
  creatingTask,
  onCreateTask,
}: {
  activeListId: string | null
  creatingTask: boolean
  onCreateTask?: WorkTasksProps['onCreateTask']
}) {
  if (!onCreateTask) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = String(data.get('title') ?? '').trim()
    const importance = workTaskImportanceSchema.safeParse(data.get('importance'))
    if (!title || !importance.success) return

    const created = await onCreateTask?.({
      title,
      ...(activeListId ? { listId: activeListId } : {}),
      description: String(data.get('description') ?? '').trim() || null,
      importance: importance.data,
      due: dueFromForm(data.get('due')),
    })
    if (created) form.reset()
  }

  return (
    <details className="border-876-surface-border rounded-xl border p-3">
      <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
        Add task
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
        <input
          name="title"
          placeholder="Task title"
          maxLength={240}
          required
          disabled={creatingTask}
          className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
        />
        <textarea
          name="description"
          placeholder="Description (optional)"
          maxLength={10_000}
          disabled={creatingTask}
          rows={2}
          className="border-876-surface-border bg-background w-full resize-y rounded-lg border px-2.5 py-2 text-sm"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            name="importance"
            defaultValue="NORMAL"
            disabled={creatingTask}
            aria-label="Importance"
            className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
          >
            <option value="LOW">Low importance</option>
            <option value="NORMAL">Normal importance</option>
            <option value="HIGH">High importance</option>
            <option value="URGENT">Urgent</option>
          </select>
          <input
            type="datetime-local"
            name="due"
            disabled={creatingTask}
            aria-label="Due date and time"
            className="border-876-surface-border bg-background w-full rounded-lg border px-2.5 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creatingTask}
          className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
        >
          {creatingTask ? 'Adding…' : 'Add task'}
        </button>
      </form>
    </details>
  )
}

export function WorkTasks({
  taskLists,
  tasks,
  activeListId,
  onSelectList,
  mutatingTaskId,
  creatingTask = false,
  onCreateTask,
  onUpdateTask,
  onCompleteTask,
  onCancelTask,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  className,
}: WorkTasksProps) {
  const activeTasks = tasks.filter(
    (task) => task.status !== 'DONE' && task.status !== 'CANCELLED'
  )
  const closedTasks = tasks.filter(
    (task) => task.status === 'DONE' || task.status === 'CANCELLED'
  )

  return (
    <section className={cn('space-y-4 p-4', className)} aria-label="Tasks">
      <header>
        <p className="text-base font-semibold">Tasks</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Your assigned Work tasks.
        </p>
      </header>

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Task lists"
      >
        <button
          type="button"
          aria-pressed={activeListId === null}
          onClick={() => onSelectList(null)}
          className="border-876-surface-border aria-pressed:bg-muted focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          All
        </button>
        {taskLists.map((list) => (
          <button
            key={list.id}
            type="button"
            aria-pressed={activeListId === list.id}
            onClick={() => onSelectList(list.id)}
            className="border-876-surface-border aria-pressed:bg-muted focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            {list.name}
          </button>
        ))}
      </div>

      <CreateTaskForm
        activeListId={activeListId}
        creatingTask={creatingTask}
        onCreateTask={onCreateTask}
      />

      <WorkTaskList
        tasks={activeTasks}
        empty="No active tasks in this list."
        renderTask={(task) => (
          <TaskRow
            task={task}
            mutatingTaskId={mutatingTaskId}
            onUpdateTask={onUpdateTask}
            onCompleteTask={onCompleteTask}
            onCancelTask={onCancelTask}
          />
        )}
      />

      {hasMore && onLoadMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void onLoadMore()}
          className="border-876-surface-border hover:bg-muted focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
        >
          {loadingMore ? 'Loading more…' : 'Load more'}
        </button>
      ) : null}

      {closedTasks.length > 0 ? (
        <details className="border-876-surface-border rounded-xl border p-3">
          <summary className="focus-visible:ring-ring cursor-pointer list-none rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
            Completed or cancelled ({closedTasks.length})
          </summary>
          <WorkTaskList
            tasks={closedTasks}
            className="mt-3"
            renderTask={(task) => <TaskRow task={task} />}
          />
        </details>
      ) : null}
    </section>
  )
}