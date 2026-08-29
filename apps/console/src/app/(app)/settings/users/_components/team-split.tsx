'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Settings } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { cn } from '@876/core/utils'
import { CondensedTeamRow, TeamTableRow, type TeamRow } from './member-row'
import { TeamMemberDetail } from './team-member-detail'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  members: TeamRow[]
  selectedId?: string
  basePath?: string
}

export function TeamSplit({
  members,
  selectedId,
  basePath = '/settings/users',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = members.find((m) => m.id === selectedId)

  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [entrance, setEntrance] = useState<{
    id?: string
    kind: 'open' | 'switch'
  }>({ id: selectedId, kind: 'switch' })

  if (entrance.id !== selectedId) {
    setEntrance({
      id: selectedId,
      kind: entrance.id === undefined ? 'open' : 'switch',
    })
  }

  const isSwitch = entrance.kind === 'switch'

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  function select(id?: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (closing) setClosing(false)

    const next = new URLSearchParams(searchParams.toString())

    if (id) next.set('member', id)
    else next.delete('member')

    const query = next.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  function requestClose() {
    if (closing) return
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      setClosing(false)
      select()
    }, EXIT_MS)
  }

  if (members.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Settings />
          </EmptyMedia>
          <EmptyTitle>No team members</EmptyTitle>
          <EmptyDescription>
            No Console access grants match this view.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (!selected) {
    return (
      <div className="876-card overflow-hidden">
        <Table>
          <TeamTableHeader />
          <TableBody>
            {members.map((user) => (
              <TeamTableRow
                key={user.id}
                user={user}
                onSelect={() => select(user.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-4 py-3 text-xs font-semibold">
                Team
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((user) => (
              <CondensedTeamRow
                key={user.id}
                user={user}
                selected={user.id === selected.id}
                onSelect={() => select(user.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <TeamMemberDetail
        key={selected.id}
        member={selected}
        onClose={requestClose}
        className={cn(
          'motion-safe:duration-300 motion-safe:ease-out',
          closing
            ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-right-4 motion-safe:fill-mode-forwards motion-safe:duration-200 motion-safe:ease-in'
            : isSwitch
              ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200'
              : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4'
        )}
      />
    </div>
  )
}

function TeamTableHeader() {
  return (
    <TableHeader className="876-header-row">
      <TableRow>
        <TableHead className="w-12 px-5 py-3.5">
          <span className="sr-only">Avatar</span>
        </TableHead>
        <TableHead className="px-5 py-3.5">Name</TableHead>
        <TableHead className="px-5 py-3.5">Email</TableHead>
        <TableHead className="px-5 py-3.5">Position</TableHead>
        <TableHead className="px-5 py-3.5">Role</TableHead>
      </TableRow>
    </TableHeader>
  )
}
