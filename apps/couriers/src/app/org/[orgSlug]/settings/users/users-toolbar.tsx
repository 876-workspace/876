'use client'

import { useState } from 'react'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

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
