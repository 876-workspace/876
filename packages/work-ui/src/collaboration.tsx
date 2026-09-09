import type {
  WorkAssignmentRole,
  WorkAssignmentTargetType,
  WorkEventParticipant,
  WorkParticipantRole,
  WorkTaskAssignment,
} from '@876/work'
import type { FormEvent } from 'react'

import { cn } from '@876/core/utils'

export type WorkTaskAssignmentDraft = {
  targetType: WorkAssignmentTargetType
  assigneeId: string
  role?: WorkAssignmentRole
  delegatedFromAssignmentId?: string | null
}

export type WorkTaskAssignmentsProps = {
  assignments: readonly WorkTaskAssignment[]
  pending?: boolean
  canManage?: boolean
  canRespond?: boolean
  onAssign?: (input: WorkTaskAssignmentDraft) => boolean | Promise<boolean>
  onRemove?: (assignment: WorkTaskAssignment) => void | Promise<void>
  onRespond?: (
    assignment: WorkTaskAssignment,
    status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED'
  ) => void | Promise<void>
  className?: string
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase()
}

export function WorkTaskAssignments({
  assignments,
  pending = false,
  canManage = false,
  canRespond = false,
  onAssign,
  onRemove,
  onRespond,
  className,
}: WorkTaskAssignmentsProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onAssign) return
    const form = event.currentTarget
    const data = new FormData(form)
    const assigneeId = String(data.get('assigneeId') ?? '').trim()
    const targetType = String(data.get('targetType')) as WorkAssignmentTargetType
    const role = String(data.get('role')) as WorkAssignmentRole
    if (!assigneeId || !['USER', 'TEAM'].includes(targetType)) return
    const created = await onAssign({ targetType, assigneeId, role })
    if (created) form.reset()
  }

  return (
    <section
      className={cn('border-876-surface-border rounded-xl border p-3', className)}
      aria-label="Task assignments"
    >
      <p className="text-sm font-medium">Assignments</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Delegate or collaborate without changing task ownership semantics.
      </p>

      <ul className="mt-3 space-y-2" aria-live="polite">
        {assignments.length === 0 ? (
          <li className="text-muted-foreground text-xs">No assignments.</li>
        ) : (
          assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="border-876-surface-border rounded-lg border p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {assignment.assigneeId}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {label(assignment.targetType)} · {label(assignment.role)} ·{' '}
                    {label(assignment.status)}
                  </p>
                </div>
                {canManage && onRemove ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onRemove(assignment)}
                    className="focus-visible:ring-ring rounded px-2 py-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {canRespond && onRespond && assignment.targetType === 'USER' ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assignment.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void onRespond(assignment, 'ACCEPTED')}
                        className="border-876-surface-border rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void onRespond(assignment, 'DECLINED')}
                        className="border-876-surface-border rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </>
                  ) : assignment.status === 'ACCEPTED' ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onRespond(assignment, 'COMPLETED')}
                      className="border-876-surface-border rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-60"
                    >
                      Mark assignment complete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {canManage && onAssign ? (
        <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium">
              Target
              <select
                name="targetType"
                defaultValue="USER"
                disabled={pending}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="USER">User</option>
                <option value="TEAM">Team</option>
              </select>
            </label>
            <label className="text-xs font-medium">
              Role
              <select
                name="role"
                defaultValue="COLLABORATOR"
                disabled={pending}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="OWNER">Owner</option>
                <option value="COLLABORATOR">Collaborator</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="WATCHER">Watcher</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium">
            User or team ID
            <input
              name="assigneeId"
              required
              disabled={pending}
              placeholder="usr_… or team_…"
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
          >
            Assign
          </button>
        </form>
      ) : null}
    </section>
  )
}

export type WorkEventParticipantDraft =
  | {
      kind: 'USER'
      participantId: string
      name?: string | null
      role?: WorkParticipantRole
    }
  | {
      kind: 'EMAIL'
      email: string
      name?: string | null
      role?: WorkParticipantRole
    }

export type WorkEventParticipantsProps = {
  participants: readonly WorkEventParticipant[]
  pending?: boolean
  canManage?: boolean
  canRespond?: boolean
  onInvite?: (input: WorkEventParticipantDraft) => boolean | Promise<boolean>
  onRemove?: (participant: WorkEventParticipant) => void | Promise<void>
  onRespond?: (
    participant: WorkEventParticipant,
    status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
  ) => void | Promise<void>
  className?: string
}

export function WorkEventParticipants({
  participants,
  pending = false,
  canManage = false,
  canRespond = false,
  onInvite,
  onRemove,
  onRespond,
  className,
}: WorkEventParticipantsProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onInvite) return
    const form = event.currentTarget
    const data = new FormData(form)
    const kind = String(data.get('kind'))
    const identity = String(data.get('identity') ?? '').trim()
    const name = String(data.get('name') ?? '').trim() || null
    const role = String(data.get('role')) as WorkParticipantRole
    if (!identity) return
    const input: WorkEventParticipantDraft =
      kind === 'EMAIL'
        ? { kind: 'EMAIL', email: identity, name, role }
        : { kind: 'USER', participantId: identity, name, role }
    const created = await onInvite(input)
    if (created) form.reset()
  }

  return (
    <section
      className={cn('border-876-surface-border rounded-xl border p-3', className)}
      aria-label="Event participants"
    >
      <p className="text-sm font-medium">Participants</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Invite people and respond to your own event invitation.
      </p>

      <ul className="mt-3 space-y-2" aria-live="polite">
        {participants.length === 0 ? (
          <li className="text-muted-foreground text-xs">No participants.</li>
        ) : (
          participants.map((participant) => (
            <li
              key={participant.id}
              className="border-876-surface-border rounded-lg border p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {participant.name ??
                      participant.email ??
                      participant.participantId ??
                      'Participant'}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {label(participant.role)} · {label(participant.status)}
                  </p>
                </div>
                {canManage && onRemove ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onRemove(participant)}
                    className="focus-visible:ring-ring rounded px-2 py-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {canRespond &&
              onRespond &&
              participant.kind === 'USER' &&
              participant.status !== 'DELEGATED' ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['ACCEPTED', 'TENTATIVE', 'DECLINED'] as const).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={pending || participant.status === status}
                        onClick={() => void onRespond(participant, status)}
                        className="border-876-surface-border rounded border px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                      >
                        {label(status)}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {canManage && onInvite ? (
        <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium">
              Kind
              <select
                name="kind"
                defaultValue="USER"
                disabled={pending}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="USER">876 user</option>
                <option value="EMAIL">Email</option>
              </select>
            </label>
            <label className="text-xs font-medium">
              Role
              <select
                name="role"
                defaultValue="REQUIRED"
                disabled={pending}
                className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="CHAIR">Chair</option>
                <option value="REQUIRED">Required</option>
                <option value="OPTIONAL">Optional</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium">
            User ID or email
            <input
              name="identity"
              required
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium">
            Display name
            <input
              name="name"
              disabled={pending}
              className="border-876-surface-border bg-background mt-1 w-full rounded-lg border px-2 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60"
          >
            Add participant
          </button>
        </form>
      ) : null}
    </section>
  )
}
