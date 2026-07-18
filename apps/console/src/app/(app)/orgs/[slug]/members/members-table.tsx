'use client'

import Link from 'next/link'
import type { AdminInviteToken, AdminMembership, AdminUser } from '@876/admin'
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

type MemberRow = {
  membership: AdminMembership
  user: AdminUser | undefined
}

const memberColumns: ColumnDef<MemberRow, unknown>[] = [
  {
    id: 'name',
    header: 'Member',
    cell: ({ row }) => {
      const user = row.original.user
      const name = user
        ? `${user.first_name} ${user.last_name}`.trim()
        : row.original.membership.user_id
      return (
        <div className="flex flex-col">
          {user ? (
            <Link
              href={`/users/${user.username ?? user.id}`}
              className="hover:text-primary font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          ) : (
            <span className="font-medium">{name}</span>
          )}
          {user?.email && (
            <span className="text-muted-foreground text-xs">{user.email}</span>
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
          roleBadgeClass(row.original.membership.role)
        )}
      >
        {row.original.membership.role}
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
          statusBadgeClass(row.original.membership.status)
        )}
      >
        {row.original.membership.status}
      </span>
    ),
  },
  {
    id: 'joined',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.membership.created_at)}
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
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.expires_at)}
      </span>
    ),
  },
]

type Props = {
  memberships: AdminMembership[]
  usersById: Record<string, AdminUser>
  invites: AdminInviteToken[]
}

export function MembersTable({ memberships, usersById, invites }: Props) {
  const memberRows: MemberRow[] = memberships.map((m) => ({
    membership: m,
    user: usersById[m.user_id],
  }))

  const pendingInvites = invites.filter((i) => i.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="876-card overflow-hidden">
        <DataTable columns={memberColumns} data={memberRows} />
      </div>

      {pendingInvites.length > 0 && (
        <div>
          <h3 className="876-section-title mb-3">Pending Invites</h3>
          <div className="876-card overflow-hidden">
            <DataTable columns={inviteColumns} data={pendingInvites} />
          </div>
        </div>
      )}
    </div>
  )
}
