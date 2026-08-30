'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { TableCell, TableRow } from '@876/ui/table'

import { client } from '@/lib/client'

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  owner: 'Owner',
  super_admin: 'Super Admin',
}

const AFFILIATION_LABELS: Record<string, string> = {
  staff: 'Staff',
  contractor: 'Contractor',
  external: 'External',
}

import { cn } from '@876/core/utils'

export type TeamRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string | null
  avatar: string | null
  position: string | null
  affiliation: string
  role: string
  permissions?: string[]
  status?: string
  createdAt?: number | null
  expiresAt: number | null
  resolved: boolean
}

function initialsOf(user: TeamRow): string {
  return (
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    '?'
  )
}

function formatExpiry(value: number | null, affiliation: string): string {
  if (affiliation === 'staff' || value === null) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value * 1000))
}

export function TeamTableRow({
  user,
  selected,
  onSelect,
}: {
  user: TeamRow
  selected?: boolean
  onSelect?: (id: string) => void
}) {
  const router = useRouter()
  const [revoking, setRevoking] = useState(false)
  const displayName = user.resolved
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'Unresolved account'
  const href = `/settings/users/${user.id}`

  function handleClick() {
    if (onSelect) {
      onSelect(user.id)
    } else {
      router.push(href)
    }
  }

  async function revokeGrant() {
    setRevoking(true)
    const result = await client.team.revoke(user.id)
    setRevoking(false)
    if (!result.error) router.refresh()
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
        if (event.key === 'Enter' || event.key === ' ') handleClick()
      }}
      role="link"
      aria-label={`View team member ${displayName}`}
      aria-selected={selected}
    >
      <TableCell className="py-4 pr-0 pl-5">
        <Avatar className="size-8">
          {user.avatar && <AvatarImage src={user.avatar} alt="" />}
          <AvatarFallback className="text-xs">
            {initialsOf(user)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {displayName}
          </span>
          {user.affiliation === 'external' ? (
            <Badge variant="outline" className="text-xs">
              External
            </Badge>
          ) : null}
        </div>
        {user.resolved && user.username ? (
          <p className="text-muted-foreground text-xs">@{user.username}</p>
        ) : null}
        {!user.resolved ? (
          <p className="text-muted-foreground font-mono text-xs">{user.id}</p>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {user.email || '—'}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {user.position || '—'}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
      </TableCell>
    </TableRow>
  )
}

export function CondensedTeamRow({
  user,
  selected,
  onSelect,
}: {
  user: TeamRow
  selected?: boolean
  onSelect: () => void
}) {
  const displayName = user.resolved
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'Unresolved account'

  return (
    <TableRow
      className={cn(
        'hover:bg-muted/40 cursor-pointer transition-colors',
        selected && 'bg-muted/60'
      )}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
      role="link"
      aria-label={`View team member ${displayName}`}
      aria-selected={selected}
    >
      <TableCell className="py-3 pr-3 pl-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-7 shrink-0 rounded-full after:rounded-full">
            {user.avatar && (
              <AvatarImage src={user.avatar} alt="" className="rounded-full" />
            )}
            <AvatarFallback className="rounded-full text-[0.5625rem]">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={cn(
                  'truncate text-[0.8125rem] font-medium text-sky-600 dark:text-sky-400',
                  selected && 'font-semibold'
                )}
              >
                {displayName}
              </span>
              {user.affiliation === 'external' ? (
                <Badge
                  variant="outline"
                  className="h-4 px-1 py-0 text-[0.625rem]"
                >
                  External
                </Badge>
              ) : null}
            </div>
            <span className="text-muted-foreground truncate text-xs">
              {user.position || ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
