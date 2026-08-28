'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import type { badgeVariants } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  ArrowPathIcon,
  Bell,
  CheckIcon,
  ClockIcon,
  Pencil,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'
import type { VariantProps } from 'class-variance-authority'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { MemberPicker } from '@/features/directory/components/member-picker'
import type { DirectoryMember } from '@/features/directory/types'
import { client } from '@/lib/client'
import type { CrmReminderStatus, CrmRequestReminder } from '@/types/crm'

import {
  formatDueDate,
  fromDateTimeLocal,
  isOverdue,
  toDateTimeLocal,
} from '../_lib/request-format'

export const NEW_REMINDER_FIELD_ID = 'new-request-reminder'
const COMPOSER = 'composer'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_LABEL: Record<
  CrmReminderStatus,
  { label: string; variant: BadgeVariant }
> = {
  SCHEDULED: { label: 'Scheduled', variant: 'outline' },
  SENT: { label: 'Sent', variant: 'success' },
  DISMISSED: { label: 'Dismissed', variant: 'secondary' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
}

function isActive(status: CrmReminderStatus) {
  return status === 'SCHEDULED'
}

type Draft = {
  title: string
  note: string
  remindAt: string
  userId: string | null
}

function emptyDraft(): Draft {
  return { title: '', note: '', remindAt: '', userId: null }
}

function draftFrom(reminder: CrmRequestReminder): Draft {
  return {
    title: reminder.title,
    note: reminder.note ?? '',
    remindAt: toDateTimeLocal(reminder.remindAt),
    userId: reminder.userId,
  }
}

export function RequestRemindersSection({
  requestId,
  reminders,
  currentUserId,
  members = [],
}: {
  requestId: string
  reminders: CrmRequestReminder[]
  currentUserId?: string
  members?: DirectoryMember[]
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [isPending, startTransition] = useTransition()

  const memberIndex = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members]
  )

  const ordered = useMemo(() => {
    const byTime = [...reminders].sort((a, b) => a.remindAt - b.remindAt)
    return [
      ...byTime.filter((reminder) => isActive(reminder.status)),
      ...byTime.filter((reminder) => !isActive(reminder.status)),
    ]
  }, [reminders])

  const scheduledCount = reminders.filter((reminder) =>
    isActive(reminder.status)
  ).length
  const isSubmitting = busyId === COMPOSER || isPending

  async function addReminder(event: React.FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    const remindAt = fromDateTimeLocal(draft.remindAt)
    if (!title || remindAt === null) return

    setError(null)
    setBusyId(COMPOSER)
    const result = await client.requestReminders.create(requestId, {
      title,
      note: draft.note.trim() || null,
      remindAt,
      ...(draft.userId ? { userId: draft.userId } : {}),
    })
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return
    }

    setDraft(emptyDraft())
    startTransition(() => router.refresh())
  }

  async function patchReminder(
    reminderId: string,
    params: Parameters<typeof client.requestReminders.update>[2]
  ) {
    setError(null)
    setBusyId(reminderId)
    const result = await client.requestReminders.update(
      requestId,
      reminderId,
      params
    )
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return false
    }

    startTransition(() => router.refresh())
    return true
  }

  async function saveEdit(reminderId: string, next: Draft) {
    const title = next.title.trim()
    const remindAt = fromDateTimeLocal(next.remindAt)
    if (!title || remindAt === null) return

    const saved = await patchReminder(reminderId, {
      title,
      note: next.note.trim() || null,
      remindAt,
      ...(next.userId ? { userId: next.userId } : {}),
    })
    if (saved) setEditingId(null)
  }

  async function deleteReminder(reminderId: string) {
    setError(null)
    setBusyId(reminderId)
    const result = await client.requestReminders.delete(requestId, reminderId)
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
        <Bell
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
        <h2 className="876-section-title">Reminders</h2>
        <Badge variant="secondary" className="px-1.5 tabular-nums">
          {reminders.length}
        </Badge>
        {reminders.length > 0 ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {scheduledCount} scheduled
          </span>
        ) : null}
      </div>

      {error ? (
        <AppError
          title="Reminder change could not be saved"
          error={error}
          variant="form"
        />
      ) : null}

      {reminders.length === 0 ? (
        <p className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
          No reminders on this request yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((reminder) => (
            <li key={reminder.id}>
              <ReminderRow
                reminder={reminder}
                owner={memberIndex.get(reminder.userId)}
                isOwnedByViewer={reminder.userId === currentUserId}
                members={members}
                busy={busyId === reminder.id || isPending}
                editing={editingId === reminder.id}
                onEdit={() => setEditingId(reminder.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(next) => saveEdit(reminder.id, next)}
                onStatusChange={(status) =>
                  patchReminder(reminder.id, { status })
                }
                onDelete={() => deleteReminder(reminder.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addReminder} className="876-card flex flex-col gap-3 p-4">
        <Input
          id={NEW_REMINDER_FIELD_ID}
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          placeholder="Remind me to…"
          disabled={isSubmitting}
          aria-label="New reminder"
        />

        <ReminderFields
          draft={draft}
          members={members}
          disabled={isSubmitting}
          idPrefix="new-reminder"
          onChange={setDraft}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="info"
            size="sm"
            disabled={isSubmitting || !draft.title.trim() || !draft.remindAt}
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
            {isSubmitting ? 'Adding' : 'Add reminder'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function ReminderFields({
  draft,
  members,
  disabled,
  idPrefix,
  onChange,
}: {
  draft: Draft
  members: DirectoryMember[]
  disabled: boolean
  idPrefix: string
  onChange: (next: Draft) => void
}) {
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    onChange({ ...draft, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col">
          <label
            htmlFor={`${idPrefix}-at`}
            className="text-muted-foreground mb-1.5 text-xs font-medium"
          >
            Remind at
          </label>
          <Input
            id={`${idPrefix}-at`}
            type="datetime-local"
            value={draft.remindAt}
            onChange={(event) => set('remindAt', event.target.value)}
            disabled={disabled}
            required
          />
        </div>

        <div className="flex flex-col">
          <span className="text-muted-foreground mb-1.5 text-xs font-medium">
            Remind
          </span>
          <MemberPicker
            members={members}
            value={draft.userId}
            onSelect={(userId) => set('userId', userId)}
            placeholder="Me"
            emptyLabel="No members found."
            allowUnassigned
          />
        </div>
      </div>

      <Textarea
        value={draft.note}
        onChange={(event) => set('note', event.target.value)}
        rows={2}
        placeholder="Note (optional)"
        disabled={disabled}
        aria-label="Reminder note"
      />
    </div>
  )
}

function ReminderRow({
  reminder,
  owner,
  isOwnedByViewer,
  members,
  busy,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onStatusChange,
  onDelete,
}: {
  reminder: CrmRequestReminder
  owner?: DirectoryMember
  isOwnedByViewer: boolean
  members: DirectoryMember[]
  busy: boolean
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (next: Draft) => void
  onStatusChange: (status: CrmReminderStatus) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(reminder))
  const active = isActive(reminder.status)
  const status = STATUS_LABEL[reminder.status] ?? {
    label: reminder.status,
    variant: 'outline' as const,
  }

  function beginEdit() {
    setDraft(draftFrom(reminder))
    onEdit()
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
          aria-label="Reminder title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancelEdit()
          }}
        />
        <ReminderFields
          draft={draft}
          members={members}
          disabled={busy}
          idPrefix={`reminder-${reminder.id}`}
          onChange={setDraft}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={() => onSave(draft)}
            disabled={busy || !draft.title.trim() || !draft.remindAt}
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
      <span
        className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <ClockIcon className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={beginEdit}
          className={
            active
              ? 'text-foreground w-full cursor-text text-left text-sm font-medium'
              : 'text-muted-foreground w-full cursor-text text-left text-sm font-medium'
          }
        >
          {reminder.title}
        </button>

        {reminder.note ? (
          <p className="text-muted-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
            {reminder.note}
          </p>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={
              active && isOverdue(reminder.remindAt)
                ? 'text-destructive'
                : undefined
            }
            suppressHydrationWarning
          >
            {formatDueDate(reminder.remindAt)}
          </span>

          <span className="flex items-center gap-1.5">
            {owner ? (
              <CustomerAvatar
                name={owner.name}
                src={owner.avatar}
                className="size-4 rounded-full text-[0.5rem] after:rounded-full [&_[data-slot=avatar-fallback]]:rounded-full [&_[data-slot=avatar-fallback]]:text-[0.5rem] [&_[data-slot=avatar-image]]:rounded-full"
              />
            ) : null}
            {isOwnedByViewer ? 'You' : (owner?.name ?? reminder.userId)}
          </span>

          <Badge variant={status.variant} className="px-1.5 text-[0.6875rem]">
            {status.label}
          </Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {active ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-7"
              onClick={() => onStatusChange('DISMISSED')}
              disabled={busy}
              aria-label={`Dismiss ${reminder.title}`}
              title="Dismiss"
            >
              <CheckIcon className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-7"
              onClick={() => onStatusChange('CANCELLED')}
              disabled={busy}
              aria-label={`Cancel ${reminder.title}`}
              title="Cancel"
            >
              <XMarkIcon className="size-3.5" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7"
            onClick={() => onStatusChange('SCHEDULED')}
            disabled={busy}
            aria-label={`Reschedule ${reminder.title}`}
            title="Reschedule"
          >
            <ArrowPathIcon className="size-3.5" aria-hidden="true" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7"
          onClick={beginEdit}
          disabled={busy}
          aria-label={`Edit ${reminder.title}`}
          title="Edit reminder"
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
          aria-label={`Delete ${reminder.title}`}
          title="Delete reminder"
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
