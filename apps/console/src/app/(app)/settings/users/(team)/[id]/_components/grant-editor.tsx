'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import { assignableRoleSchema } from '@/types/role'
import type {
  TeamAffiliation,
  TeamGrantStatus,
  TeamGrantUpdate,
} from '@/types/team'

type Props = {
  memberId: string
  canUpdate: boolean
  canSuspend: boolean
  viewerRole: string | null
  initial: {
    roleName: string
    status: TeamGrantStatus
    affiliation: TeamAffiliation
    title: string | null
    expiresAt: number | null
    justification: string | null
  }
}

function toDateInput(unixSeconds: number | null): string {
  if (unixSeconds === null) return ''

  const date = new Date(unixSeconds * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromDateInput(value: string): number | null {
  if (!value) return null

  const parsed = new Date(`${value}T00:00:00`).getTime()
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}

/** Edits the Console-local fields that define one member's access grant. */
export function GrantEditor({
  memberId,
  canUpdate,
  canSuspend,
  viewerRole,
  initial,
}: Props) {
  const router = useRouter()
  const [roleName, setRoleName] = useState(initial.roleName)
  const [status, setStatus] = useState(initial.status)
  const [affiliation, setAffiliation] = useState(initial.affiliation)
  const [title, setTitle] = useState(initial.title ?? '')
  const [expiresAt, setExpiresAt] = useState(toDateInput(initial.expiresAt))
  const [justification, setJustification] = useState(
    initial.justification ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const needsGrantDetails = affiliation !== 'staff'
  const canAssignSuperAdmin = viewerRole === 'super-admin'

  function save() {
    setError(null)
    const update: TeamGrantUpdate = {}
    if (roleName !== initial.roleName) {
      const nextRole = assignableRoleSchema.safeParse(roleName)
      if (!nextRole.success) return
      update.roleName = nextRole.data
    }
    if (canSuspend && status !== initial.status) update.status = status
    if (affiliation !== initial.affiliation) update.affiliation = affiliation
    if (needsGrantDetails) {
      const nextExpiresAt = fromDateInput(expiresAt)
      if (expiresAt !== toDateInput(initial.expiresAt))
        update.expiresAt = nextExpiresAt
      if (title !== (initial.title ?? '')) update.title = title || null
      if (justification !== (initial.justification ?? ''))
        update.justification = justification || null
    } else if (initial.affiliation !== 'staff') {
      update.title = null
      update.expiresAt = null
      update.justification = null
    }
    if (Object.keys(update).length === 0) return

    startSave(async () => {
      const result = await client.team.update(memberId, update)
      if (result.error) {
        setError(result.error.message)
        return
      }

      router.refresh()
    })
  }

  return (
    <section className="border-876-surface-border bg-muted/20 space-y-4 rounded-xl border p-4">
      <div>
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          Console Access
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Role" htmlFor="member-role">
          <Select
            value={roleName}
            onValueChange={(value) => setRoleName(value ?? roleName)}
            disabled={!canUpdate || saving}
          >
            <SelectTrigger id="member-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              {canAssignSuperAdmin ? (
                <SelectItem value="super-admin">Super Admin</SelectItem>
              ) : null}
              {!['staff', 'admin', 'super-admin'].includes(roleName) ? (
                <SelectItem value={roleName}>{roleName}</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="Status" htmlFor="member-status">
          <Select
            value={status}
            onValueChange={(value) =>
              value && setStatus(value as TeamGrantStatus)
            }
            disabled={!canSuspend || saving}
          >
            <SelectTrigger id="member-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="Affiliation" htmlFor="member-affiliation">
          <Select
            value={affiliation}
            onValueChange={(value) =>
              value && setAffiliation(value as TeamAffiliation)
            }
            disabled={!canUpdate || saving}
          >
            <SelectTrigger id="member-affiliation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        {needsGrantDetails ? (
          <FormRow label="Access expires" htmlFor="member-expiry" required>
            <Input
              id="member-expiry"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              disabled={!canUpdate || saving}
            />
          </FormRow>
        ) : null}
      </div>

      {needsGrantDetails ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Title" htmlFor="member-title">
            <Input
              id="member-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canUpdate || saving}
            />
          </FormRow>
          <FormRow
            label="Justification"
            htmlFor="member-justification"
            required
          >
            <Textarea
              id="member-justification"
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              disabled={!canUpdate || saving}
            />
          </FormRow>
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      {canUpdate || canSuspend ? (
        <Button type="button" variant="info" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save access'}
        </Button>
      ) : null}
    </section>
  )
}
