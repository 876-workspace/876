'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Users } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import {
  memberInitials,
  memberName,
  memberRoleLabel,
} from '@876/access-ui/member-utils'
import type { OrgMember } from '@876/access-ui/member-types'


function memberHref(id: string) {
  return `/settings/users/${encodeURIComponent(id)}`
}

export function UsersList({ members }: { members: OrgMember[] }) {
  const selectedId = useDetailSegments()[0] ?? null
  const status = useSearchParams().get('status') ?? 'all'
  const rows = useMemo(
    () =>
      status === 'all'
        ? members
        : members.filter((member) => member.status === status),
    [members, status]
  )
  if (!selectedId)
    return (
      <div className="876-card overflow-hidden">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5">Member</TableHead>
              <TableHead className="px-5 py-3.5">Email</TableHead>
              <TableHead className="px-5 py-3.5">Position</TableHead>
              <TableHead className="px-5 py-3.5">Role</TableHead>
              <TableHead className="px-5 py-3.5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <UsersEmpty />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((member) => (
                <MemberTableRow key={member.id} member={member} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )
  return (
    <ListPane>
      <ListPaneHeader>Users</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No users match this view</ListPaneEmpty>
        ) : (
          rows.map((member) => (
            <ListPaneItem
              key={member.id}
              href={memberHref(member.id)}
              label={`View user ${memberName(member)}`}
              selected={member.id === selectedId}
              leading={<MemberAvatar member={member} />}
              title={memberName(member)}
              subtitle={member.position ?? memberRoleLabel(member.role)}
              trailing={
                member.status === 'active' ? null : (
                  <Badge variant="secondary" className="capitalize">
                    {member.status}
                  </Badge>
                )
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function MemberTableRow({ member }: { member: OrgMember }) {
  const name = memberName(member)
  return (
    <TableRow>
      <TableCell className="group relative px-5 py-4">
        <Link
          href={memberHref(member.id)}
          aria-label={`View user ${name}`}
          className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <div className="flex items-center gap-3">
          <MemberAvatar member={member} />
          <div className="min-w-0">
            <span className="text-[0.8125rem] font-medium text-sky-600 group-hover:text-sky-700 group-hover:underline hover:text-sky-700 hover:underline dark:text-sky-400 dark:group-hover:text-sky-300 dark:hover:text-sky-300">
              {name}
            </span>
            <p className="text-muted-foreground text-xs">
              {member.email ?? `@${member.user_id}`}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {member.email ?? '—'}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {member.position ?? '—'}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline">{memberRoleLabel(member.role)}</Badge>
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge
          variant={member.status === 'active' ? 'secondary' : 'warning'}
          className="capitalize"
        >
          {member.status}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
function MemberAvatar({ member }: { member: OrgMember }) {
  return (
    <Avatar className="size-8 shrink-0">
      <AvatarImage src={member.avatar ?? undefined} alt="" />
      <AvatarFallback className="text-xs">
        {memberInitials(member)}
      </AvatarFallback>
    </Avatar>
  )
}

function UsersEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No users</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
