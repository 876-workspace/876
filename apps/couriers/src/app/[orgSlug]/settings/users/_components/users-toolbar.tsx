'use client'

import { useState } from 'react'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { InviteDialog } from './invite-dialog'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All users' },
  { value: 'active', label: 'Active', headingLabel: 'Active users' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive users' },
]

type Props = {
  orgSlug: string
  roles: Array<{ id: string; name: string }>
  status: string
}

export function UsersToolbar({ orgSlug, roles, status }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <>
      <ResourceToolbar
        title="Users"
        titleFilter={
          <StatusFilterHeading
            label="Users"
            paramKey="status"
            value={status}
            options={STATUS_OPTIONS}
          />
        }
        primaryLabel="Invite"
        primaryVariant="info"
        // The loading fallback renders this toolbar for real and interactively,
        // so Invite must stay disabled until roles exist — the dialog has no
        // role to assign without them, and its submit would be dead anyway.
        primaryDisabled={roles.length === 0}
        onPrimaryAction={() => setInviteOpen(true)}
        refresh
      />
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        orgSlug={orgSlug}
        roles={roles}
      />
    </>
  )
}
