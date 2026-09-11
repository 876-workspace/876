'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Users } from '@876/ui/icons'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
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

import { useTeamMemberLinks } from '../_lib/use-team-member-links'
import {
  ROLE_LABELS,
  TeamMemberTableRow,
  initialsOf,
  type TeamMemberRow,
} from './team-member-row'

type Props = {
  members: TeamMemberRow[]
}

/**
 * The list column in both of its forms: the full-width table when no member is
 * open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width, and the status filter is applied in one
 * place rather than twice.
 */
export function TeamList({ members }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedId = segments[0] ?? null
  const open = selectedId !== null

  // Applied here rather than in the loader because a layout receives no
  // `searchParams`.
  const status = searchParams.get('status') ?? 'all'
  const rows = useMemo(() => {
    if (status === 'all') return members
    return members.filter((member) => member.status === status)
  }, [members, status])

  if (!open)
    return (
      <div className="876-card overflow-hidden">
        <Table>
          <TeamTableHeader />
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <TeamEmpty />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((member) => (
                <TeamMemberTableRow key={member.id} user={member} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No users match this view</ListPaneEmpty>
        ) : (
          rows.map((member) => (
            <CondensedMemberPaneItem
              key={member.id}
              member={member}
              selected={member.id === selectedId}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function TeamEmpty() {
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

function TeamTableHeader() {
  return (
    <TableHeader className="876-header-row">
      <TableRow>
        <TableHead className="px-5 py-3.5">Name</TableHead>
        <TableHead className="px-5 py-3.5">Email</TableHead>
        <TableHead className="px-5 py-3.5">Position</TableHead>
        <TableHead className="px-5 py-3.5">Role</TableHead>
      </TableRow>
    </TableHeader>
  )
}

function CondensedMemberPaneItem({
  member,
  selected,
}: {
  member: TeamMemberRow
  selected: boolean
}) {
  const linkTo = useTeamMemberLinks()
  const displayName = member.resolved
    ? [member.firstName, member.lastName].filter(Boolean).join(' ') ||
      member.email
    : 'Unresolved account'
  const subtitle = member.position || ROLE_LABELS[member.role] || member.role

  return (
    <ListPaneItem
      href={linkTo(`/settings/users/${encodeURIComponent(member.id)}`)}
      selected={selected}
      label={`View team member ${displayName}`}
      leading={
        <Avatar className="size-7">
          {member.avatar && <AvatarImage src={member.avatar} alt="" />}
          <AvatarFallback className="text-[0.5625rem]">
            {initialsOf(member)}
          </AvatarFallback>
        </Avatar>
      }
      title={displayName}
      subtitle={subtitle}
      trailing={
        member.status && member.status !== 'active' ? (
          <Badge variant="secondary" className="capitalize">
            {member.status}
          </Badge>
        ) : null
      }
    />
  )
}
