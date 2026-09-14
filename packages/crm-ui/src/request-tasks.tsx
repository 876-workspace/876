'use client'

import { useState, type FormEvent } from 'react'

import type { CreateRequestTaskInput, RequestTask } from '@876/crm'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

export type RequestTaskCreateInput = Omit<CreateRequestTaskInput, 'createdBy'>

export type RequestTaskMutationResult = {
  error: AppErrorValue | null
}

function formatDueDate(value: number | null) {
  if (value == null) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(value * 1000)
  )
}

/**
 * Shared request-task presentation. Hosts retain their own browser transport
 * and caller authority while every CRM request renders the same task concept.
 */
export function RequestTasksPanel({
  tasks,
  onCreate,
  onChanged,
}: {
  tasks: readonly RequestTask[]
  onCreate: (
    input: RequestTaskCreateInput
  ) => Promise<RequestTaskMutationResult>
  onChanged?: () => void
}) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const taskTitle = title.trim()
    if (!taskTitle || saving) return

    const dueAt = dueDate
      ? Math.floor(new Date(`${dueDate}T12:00:00`).getTime() / 1000)
      : null
    if (dueAt != null && Number.isNaN(dueAt)) {
      setError({
        code: 'crm/invalid-request',
        message: 'Choose a valid due date.',
      })
      return
    }

    setSaving(true)
    setError(null)
    const result = await onCreate({
      title: taskTitle,
      assigneeId: assigneeId.trim() || null,
      dueAt,
    })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setTitle('')
    setAssigneeId('')
    setDueDate('')
    onChanged?.()
  }

  return (
    <section className="space-y-4" aria-label="Request tasks">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Tasks</h2>
        <Badge variant="secondary" className="px-1.5 tabular-nums">
          {tasks.length}
        </Badge>
      </div>

      {error ? (
        <AppError
          title="Task could not be added"
          error={error}
          variant="form"
        />
      ) : null}

      {tasks.length ? (
        <ul className="divide-y rounded-md border">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{task.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {task.assigneeId ?? 'Unassigned'} ·{' '}
                  {formatDueDate(task.dueAt)}
                </p>
              </div>
              <Badge variant="secondary">{task.status}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
          No tasks on this request yet.
        </p>
      )}

      <form className="space-y-3 rounded-md border p-4" onSubmit={createTask}>
        <Input
          aria-label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task…"
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            aria-label="Assignee ID"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            placeholder="Assignee ID (optional)"
          />
          <Input
            aria-label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Adding…' : 'Add task'}
        </Button>
      </form>
    </section>
  )
}
