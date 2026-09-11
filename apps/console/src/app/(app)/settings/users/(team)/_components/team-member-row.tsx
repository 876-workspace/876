'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { TableCell, TableRow } from '@876/ui/table'

import { useTeamMemberLinks } from '../_lib/use-team-member-links'

export const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  owner: 'Owner',
  super_admin: 'Super Admin',
}

export type TeamMemberRow = {
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

export function initialsOf(user: TeamMemberRow): string {
  return (
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    '?'
  )
}

export function TeamMemberTableRow({ user }: { user: TeamMemberRow }) {
  const linkTo = useTeamMemberLinks()
  const displayName = user.resolved
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'Unresolved account'
  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-4">
        <RowLink
          href={linkTo(`/settings/users/${encodeURIComponent(user.id)}`)}
          label={`View team member ${displayName}`}
        />
        <div className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0">
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback className="text-xs">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
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
              <p className="text-muted-foreground font-mono text-xs">
                {user.id}
              </p>
            ) : null}
          </div>
        </div>
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

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}
