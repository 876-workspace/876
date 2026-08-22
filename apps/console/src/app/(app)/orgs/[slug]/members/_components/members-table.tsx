'use client'

import Link from 'next/link'
import type { AdminInviteToken, AdminOrgMember } from '@876/admin'
import { cn } from '@876/core/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@/lib/format'

function initialsOf(user: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}): string {
  return (
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    '?'
  )
}

function memberDisplayName(member: AdminOrgMember): string {
  return (
    [member.first_name, member.last_name].filter(Boolean).join(' ').trim() ||
    member.user_id
  )
}

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
    accessorFn: memberDisplayName,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const member = row.original
      const name = memberDisplayName(member)

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-6 shrink-0 rounded-full after:rounded-full">
            {member.avatar && (
              <AvatarImage
                src={member.avatar}
                alt=""
                className="rounded-full"
              />
            )}
            <AvatarFallback className="rounded-full text-[0.5625rem]">
              {initialsOf(member)}
            </AvatarFallback>
          </Avatar>
          <Link
            href={`/users/${member.user_id}`}
            className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {row.original.email ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
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
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
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
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Joined" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
]

const inviteColumns: ColumnDef<AdminInviteToken, unknown>[] = [
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.email}</span>
    ),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
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
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
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
    accessorKey: 'expires_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expires" />
    ),
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
      <DataTable columns={memberColumns} data={members} enableColumnVisibility />
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
