'use client'

import { useRouter } from 'next/navigation'
import { formatDate } from '@876/core/timestamps'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Users } from '@876/ui/icons'
import { TableCell, TableRow } from '@876/ui/table'
import type { CrmTeamAutoAssign, CrmTeamStatus } from '@/types/crm'
import type { DirectoryMember } from '@/features/directory/types'
import type { TeamMemberRow } from '../[teamId]/_components/team-members'

export type TeamRow = {
  id: string
  name: string
  slug?: string
  description?: string | null
  color?: string | null
  members: TeamMemberRow[]
  isDefault: boolean
  autoAssign: CrmTeamAutoAssign
  status: CrmTeamStatus
  createdAt: number
  updatedAt?: number
}

export const AUTO_ASSIGN_LABELS: Record<CrmTeamAutoAssign, string> = {
  NONE: 'None',
  ROUND_ROBIN: 'Round robin',
  LEAST_BUSY: 'Least busy',
}

export const TEAM_COLOR_VARIANTS: Record<
  string,
  {
    bg: string
    text: string
    border: string
    badge: string
    dot: string
  }
> = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    badge: 'border-blue-400/40 bg-blue-400/10 text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    badge:
      'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
    badge:
      'border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    badge:
      'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    badge: 'border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
    badge: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-400',
    dot: 'bg-cyan-500',
  },
  slate: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    badge:
      'border-slate-400/40 bg-slate-400/10 text-slate-700 dark:text-slate-400',
    dot: 'bg-slate-500',
  },
}

export function getTeamColorVariant(color?: string | null) {
  if (color && color in TEAM_COLOR_VARIANTS) {
    return TEAM_COLOR_VARIANTS[color]
  }
  return TEAM_COLOR_VARIANTS.blue
}

function MemberStack({ members }: { members: DirectoryMember[] }) {
  const visible = members.slice(0, 5)
  const overflow = members.length - visible.length

  if (members.length === 0)
    return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((member) => (
          <CustomerAvatar
            key={member.userId}
            name={member.name}
            src={member.avatar}
            className="ring-background size-6 rounded-full ring-2 after:rounded-full [&_*]:rounded-full"
          />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="text-muted-foreground ml-2 text-xs font-medium tabular-nums">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

export function TeamTableRow({
  team,
  selected,
  onSelect,
}: {
  team: TeamRow
  selected?: boolean
  onSelect?: (id: string) => void
}) {
  const router = useRouter()
  const colorVariant = getTeamColorVariant(team.color)

  function handleClick() {
    if (onSelect) {
      onSelect(team.id)
    } else {
      router.push(`/settings/teams?team=${encodeURIComponent(team.id)}`)
    }
  }

  return (
    <TableRow
      className={cn(
        'hover:bg-muted/40 cursor-pointer transition-colors',
        selected && 'bg-muted/50'
      )}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleClick()
        }
      }}
      role="button"
      aria-label={`View team ${team.name}`}
      aria-pressed={selected}
    >
      <TableCell className="py-4 pr-0 pl-5">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg border',
            colorVariant.bg,
            colorVariant.text,
            colorVariant.border
          )}
        >
          <Users className="size-4" />
        </div>
      </TableCell>
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {team.name}
          </span>
          {team.isDefault ? <Badge variant="info">Default</Badge> : null}
        </div>
        {team.description ? (
          <p className="text-muted-foreground max-w-xs truncate text-xs">
            {team.description}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="px-5 py-4">
        <MemberStack members={team.members} />
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {AUTO_ASSIGN_LABELS[team.autoAssign]}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant={team.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {team.status === 'ACTIVE' ? 'Active' : 'Archived'}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem] whitespace-nowrap tabular-nums">
        {formatDate(team.createdAt)}
      </TableCell>
    </TableRow>
  )
}

export function CondensedTeamRow({
  team,
  selected,
  onSelect,
}: {
  team: TeamRow
  selected?: boolean
  onSelect: () => void
}) {
  const colorVariant = getTeamColorVariant(team.color)
  const memberCount = team.members.length

  return (
    <TableRow
      className={cn(
        'hover:bg-muted/40 cursor-pointer transition-colors',
        selected && 'bg-muted/60'
      )}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role="button"
      aria-label={`View team ${team.name}`}
      aria-pressed={selected}
    >
      <TableCell className="py-3 pr-3 pl-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg border',
              colorVariant.bg,
              colorVariant.text,
              colorVariant.border
            )}
          >
            <Users className="size-3.5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={cn(
                  'truncate text-[0.8125rem] font-medium text-sky-600 dark:text-sky-400',
                  selected && 'font-semibold'
                )}
              >
                {team.name}
              </span>
              {team.isDefault ? (
                <Badge variant="info" className="h-4 px-1 py-0 text-[0.625rem]">
                  Default
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground truncate text-[0.6875rem]">
                {memberCount === 0
                  ? 'No members'
                  : memberCount === 1
                    ? '1 member'
                    : `${memberCount} members`}
              </span>
              {team.status === 'ARCHIVED' ? (
                <span className="text-muted-foreground text-[0.625rem]">
                  · Archived
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
