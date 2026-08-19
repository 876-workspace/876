'use client'

import Link from 'next/link'
import type { AdminInviteToken, AdminOrgMember } from '@876/admin'
import { cn } from '@876/core/utils'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatDate } from '@/lib/format'

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'owner':
      return 'border-876-gold/40 text-876-gold-fg bg-876-gold/10'
    case 'admin':
      return 'border-876-accent/40 text-876-accent-fg bg-876-accent/10'
    default:
      return 'border-border text-muted-foreground bg-muted/40'
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'border-876-green/40 text-876-green-fg bg-876-green/10'
    case 'inactive':
    case 'suspended':
      return 'border-destructive/40 text-destructive bg-destructive/10'
    default:
      return 'border-border text-muted-foreground bg-muted/40'
  }
}

const memberColumns: ColumnDef<AdminOrgMember, unknown>[] = [
  {
    id: 'name',
    header: 'Member',
    cell: ({ row }) => {
      const member = row.original
      const name =
        [member.first_name, member.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || member.user_id

      return (
        <div className="flex flex-col">
          <Link
            href={`/users/${member.user_id}`}
            className="hover:text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
          {member.email && (
            <span className="text-muted-foreground text-xs">
              {member.email}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          roleBadgeClass(row.original.role)
        )}
      >
        {row.original.role}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          statusBadgeClass(row.original.status)
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    id: 'joined',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
]

const inviteColumns: ColumnDef<AdminInviteToken, unknown>[] = [
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.email}</span>
    ),
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          roleBadgeClass(row.original.role)
        )}
      >
        {row.original.role}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          'border-876-gold/40 text-876-gold-fg bg-876-gold/10'
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    id: 'expires',
    header: 'Expires',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {formatDate(row.original.expires_at)}
      </span>
    ),
  },
]

export function MembersTable({ members }: { members: AdminOrgMember[] }) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={memberColumns} data={members} />
    </div>
  )
}

export function PendingInvitesTable({
  invites,
}: {
  invites: AdminInviteToken[]
}) {
  const pendingInvites = invites.filter((invite) => invite.status === 'pending')
  if (pendingInvites.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="876-section-title mb-3">Pending Invites</h3>
      <div className="876-card overflow-hidden">
        <DataTable columns={inviteColumns} data={pendingInvites} />
      </div>
    </div>
  )
}
