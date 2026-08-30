'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Users } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import {
  CondensedTeamMemberRow,
  TeamMemberTableRow,
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
    <div className="876-card flex h-full min-h-0 flex-col overflow-hidden">
      <header className="876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold">
        Users
      </header>
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Table>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No users match this view
                </TableCell>
              </TableRow>
            ) : (
              rows.map((member) => (
                <CondensedTeamMemberRow
                  key={member.id}
                  user={member}
                  selected={member.id === selectedId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
