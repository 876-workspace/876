'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Plus, Users } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { DirectoryMember } from '@/features/directory/types'
import { CondensedTeamRow, TeamTableRow, type TeamRow } from './team-row'
import { TeamDetail } from './team-detail'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  teams: TeamRow[]
  directory: DirectoryMember[]
  selectedId?: string
  basePath?: string
}

export function TeamSplit({
  teams,
  directory,
  selectedId,
  basePath = '/settings/teams',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = teams.find((t) => t.id === selectedId)

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

    if (id) next.set('team', id)
    else next.delete('team')

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

  if (teams.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No teams yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/settings/teams/new"
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Add
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  if (!selected) {
    return (
      <div className="876-card overflow-hidden">
        <Table>
          <TeamTableHeader />
          <TableBody>
            {teams.map((team) => (
              <TeamTableRow
                key={team.id}
                team={team}
                onSelect={() => select(team.id)}
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
                Teams
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <CondensedTeamRow
                key={team.id}
                team={team}
                selected={team.id === selected.id}
                onSelect={() => select(team.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <TeamDetail
        key={selected.id}
        team={selected}
        directory={directory}
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
          <span className="sr-only">Icon</span>
        </TableHead>
        <TableHead className="px-5 py-3.5">Team</TableHead>
        <TableHead className="px-5 py-3.5">Members</TableHead>
        <TableHead className="px-5 py-3.5">Auto-assign</TableHead>
        <TableHead className="px-5 py-3.5">Status</TableHead>
        <TableHead className="px-5 py-3.5">Created</TableHead>
      </TableRow>
    </TableHeader>
  )
}
