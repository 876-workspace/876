'use client'

import { formatDate } from '@876/core/timestamps'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'

import { client } from '@/lib/client'

type RequestRecord = {
  id: string
  number: number
  subject: string
  customerId: string
  categoryId: string | null
  subcategoryId: string | null
  status:
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'WAITING'
    | 'RESOLVED'
    | 'CLOSED'
    | 'CANCELLED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  source: string
  teamId: string | null
  assigneeId: string | null
  ownerId: string | null
  createdBy: string
  resolvedAt: number | null
  closedAt: number | null
  createdAt: number
  updatedAt: number
}

type TaskRecord = {
  id: string
  title: string
  description: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assigneeId: string | null
  dueAt: number | null
  createdAt: number
}

type ReminderRecord = {
  id: string
  title: string
  note: string | null
  remindAt: number
  userId: string
  status: 'SCHEDULED' | 'SENT' | 'DISMISSED' | 'CANCELLED'
  createdAt: number
}

type NoteRecord = {
  id: string
  body: string
  authorId: string
  internal: boolean
  kind: string
  editedAt: number | null
  createdAt: number
}

type Props = {
  organizationId: string
  currentUserId: string
  request: RequestRecord
  tasks: TaskRecord[]
  reminders: ReminderRecord[]
  notes: NoteRecord[]
}

const REQUEST_STATUSES: RequestRecord['status'][] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]

const TASK_STATUSES: TaskRecord['status'][] = [
  'OPEN',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
]

const REMINDER_STATUSES: ReminderRecord['status'][] = [
  'SCHEDULED',
  'SENT',
  'DISMISSED',
  'CANCELLED',
]

export function RequestManager(props: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subject, setSubject] = useState(props.request.subject)
  const [taskTitle, setTaskTitle] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteBody, setEditingNoteBody] = useState('')
  const [requestError, setRequestError] = useState<AppErrorValue | null>(null)
  const [taskError, setTaskError] = useState<AppErrorValue | null>(null)
  const [reminderError, setReminderError] = useState<AppErrorValue | null>(null)
  const [noteError, setNoteError] = useState<AppErrorValue | null>(null)

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function updateRequest(
    params: Parameters<typeof client.requests.update>[2]
  ) {
    setRequestError(null)
    const result = await client.requests.update(
      props.organizationId,
      props.request.id,
      params
    )
    if (result.error) {
      setRequestError(result.error)
      return
    }
    refresh()
  }

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSubject = subject.trim()
    if (!nextSubject) return
    await updateRequest({ subject: nextSubject })
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = taskTitle.trim()
    if (!title) return

    setTaskError(null)
    const result = await client.requestTasks.create(
      props.organizationId,
      props.request.id,
      { title, createdBy: props.currentUserId }
    )
    if (result.error) {
      setTaskError(result.error)
      return
    }
    setTaskTitle('')
    refresh()
  }

  async function updateTask(taskId: string, status: TaskRecord['status']) {
    setTaskError(null)
    const result = await client.requestTasks.update(
      props.organizationId,
      props.request.id,
      taskId,
      {
        status,
        completedBy: status === 'DONE' ? props.currentUserId : null,
      }
    )
    if (result.error) {
      setTaskError(result.error)
      return
    }
    refresh()
  }

  async function deleteTask(taskId: string) {
    setTaskError(null)
    const result = await client.requestTasks.delete(
      props.organizationId,
      props.request.id,
      taskId,
      { deletedBy: props.currentUserId }
    )
    if (result.error) {
      setTaskError(result.error)
      return
    }
    refresh()
  }

  async function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = reminderTitle.trim()
    const timestamp = Math.floor(new Date(remindAt).getTime() / 1000)
    if (!title || !Number.isFinite(timestamp)) return

    setReminderError(null)
    const result = await client.requestReminders.create(
      props.organizationId,
      props.request.id,
      {
        title,
        remindAt: timestamp,
        userId: props.currentUserId,
        createdBy: props.currentUserId,
      }
    )
    if (result.error) {
      setReminderError(result.error)
      return
    }
    setReminderTitle('')
    setRemindAt('')
    refresh()
  }

  async function updateReminder(
    reminderId: string,
    status: ReminderRecord['status']
  ) {
    setReminderError(null)
    const result = await client.requestReminders.update(
      props.organizationId,
      props.request.id,
      reminderId,
      { status }
    )
    if (result.error) {
      setReminderError(result.error)
      return
    }
    refresh()
  }

  async function deleteReminder(reminderId: string) {
    setReminderError(null)
    const result = await client.requestReminders.delete(
      props.organizationId,
      props.request.id,
      reminderId,
      { deletedBy: props.currentUserId }
    )
    if (result.error) {
      setReminderError(result.error)
      return
    }
    refresh()
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = noteBody.trim()
    if (!body) return

    setNoteError(null)
    const result = await client.requestNotes.create(
      props.organizationId,
      props.request.id,
      { body, authorId: props.currentUserId, internal: true }
    )
    if (result.error) {
      setNoteError(result.error)
      return
    }
    setNoteBody('')
    refresh()
  }

  async function saveNote(noteId: string) {
    const body = editingNoteBody.trim()
    if (!body) return

    setNoteError(null)
    const result = await client.requestNotes.update(
      props.organizationId,
      props.request.id,
      noteId,
      { body, editedBy: props.currentUserId }
    )
    if (result.error) {
      setNoteError(result.error)
      return
    }
    setEditingNoteId(null)
    refresh()
  }

  async function deleteNote(noteId: string) {
    setNoteError(null)
    const result = await client.requestNotes.delete(
      props.organizationId,
      props.request.id,
      noteId,
      { deletedBy: props.currentUserId }
    )
    if (result.error) {
      setNoteError(result.error)
      return
    }
    refresh()
  }

  return (
    <div className="space-y-5" aria-busy={isPending}>
      <section className="876-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="876-page-title">{props.request.subject}</h1>
              <Badge variant="outline">
                {props.request.status.toLowerCase().replaceAll('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
              #{props.request.number} · {props.request.id}
            </p>
          </div>
          <NativeSelect
            size="sm"
            value={props.request.status}
            aria-label="Request status"
            onChange={(event) =>
              updateRequest({
                status: event.target.value as RequestRecord['status'],
              })
            }
          >
            {REQUEST_STATUSES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {status.toLowerCase().replaceAll('_', ' ')}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <form className="flex gap-2" onSubmit={saveSubject}>
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            aria-label="Subject"
          />
          <Button type="submit" variant="info" disabled={isPending}>
            Save
          </Button>
        </form>
        {requestError ? (
          <AppError
            title="Request could not be updated"
            error={requestError}
            variant="form"
            showCode
            className="mt-3"
          />
        ) : null}

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Customer" value={props.request.customerId} mono />
          <Field
            label="Priority"
            value={props.request.priority.toLowerCase()}
          />
          <Field label="Source" value={props.request.source.toLowerCase()} />
          <Field label="Assignee" value={props.request.assigneeId} mono />
          <Field label="Team" value={props.request.teamId} mono />
          <Field label="Owner" value={props.request.ownerId} mono />
          <Field label="Category" value={props.request.categoryId} mono />
          <Field label="Created" value={formatDate(props.request.createdAt)} />
        </dl>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="876-card p-5">
          <h2 className="876-section-title mb-4">Tasks</h2>
          {taskError ? (
            <AppError
              title="Task change could not be saved"
              error={taskError}
              variant="form"
              showCode
              className="mb-4"
            />
          ) : null}
          <form className="mb-4 flex gap-2" onSubmit={addTask}>
            <Input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task title"
              aria-label="Task title"
            />
            <Button type="submit" variant="info" disabled={isPending}>
              Add
            </Button>
          </form>
          <div className="space-y-2">
            {props.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{task.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {task.dueAt ? formatDate(task.dueAt) : 'No due date'} ·{' '}
                    {task.priority.toLowerCase()}
                  </p>
                </div>
                <NativeSelect
                  size="sm"
                  value={task.status}
                  aria-label={`Status for ${task.title}`}
                  onChange={(event) =>
                    updateTask(
                      task.id,
                      event.target.value as TaskRecord['status']
                    )
                  }
                >
                  {TASK_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {status.toLowerCase().replaceAll('_', ' ')}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteTask(task.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
            {props.tasks.length === 0 ? <EmptyRow label="No tasks" /> : null}
          </div>
        </section>

        <section className="876-card p-5">
          <h2 className="876-section-title mb-4">Reminders</h2>
          {reminderError ? (
            <AppError
              title="Reminder change could not be saved"
              error={reminderError}
              variant="form"
              showCode
              className="mb-4"
            />
          ) : null}
          <form
            className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={addReminder}
          >
            <Input
              value={reminderTitle}
              onChange={(event) => setReminderTitle(event.target.value)}
              placeholder="Reminder title"
              aria-label="Reminder title"
            />
            <Input
              type="datetime-local"
              value={remindAt}
              onChange={(event) => setRemindAt(event.target.value)}
              aria-label="Reminder time"
            />
            <Button type="submit" variant="info" disabled={isPending}>
              Add
            </Button>
          </form>
          <div className="space-y-2">
            {props.reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{reminder.title}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatDate(reminder.remindAt)}
                  </p>
                </div>
                <NativeSelect
                  size="sm"
                  value={reminder.status}
                  aria-label={`Status for ${reminder.title}`}
                  onChange={(event) =>
                    updateReminder(
                      reminder.id,
                      event.target.value as ReminderRecord['status']
                    )
                  }
                >
                  {REMINDER_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {status.toLowerCase()}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteReminder(reminder.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
            {props.reminders.length === 0 ? (
              <EmptyRow label="No reminders" />
            ) : null}
          </div>
        </section>
      </div>

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Notes</h2>
        {noteError ? (
          <AppError
            title="Note change could not be saved"
            error={noteError}
            variant="form"
            showCode
            className="mb-4"
          />
        ) : null}
        <form className="mb-4 flex items-start gap-2" onSubmit={addNote}>
          <Textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Add an internal note"
            aria-label="Note"
          />
          <Button type="submit" variant="info" disabled={isPending}>
            Add
          </Button>
        </form>
        <div className="space-y-3">
          {props.notes.map((note) => (
            <article key={note.id} className="rounded-md border p-4">
              {editingNoteId === note.id ? (
                <div className="flex items-start gap-2">
                  <Textarea
                    value={editingNoteBody}
                    onChange={(event) => setEditingNoteBody(event.target.value)}
                    aria-label="Edit note"
                  />
                  <Button
                    type="button"
                    variant="info"
                    onClick={() => saveNote(note.id)}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{note.body}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {note.kind.toLowerCase()} · {formatDate(note.createdAt)}
                  {note.editedAt ? ' · edited' : ''}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingNoteId(note.id)
                      setEditingNoteBody(note.body)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteNote(note.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {props.notes.length === 0 ? <EmptyRow label="No notes" /> : null}
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? 'mt-1 font-mono text-xs' : 'mt-1 capitalize'}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
      {label}
    </p>
  )
}
