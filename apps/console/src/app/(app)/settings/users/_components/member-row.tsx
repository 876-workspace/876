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
  expiresAt: number | null
  resolved: boolean
}

function initialsOf(user: TeamRow): string {
  return (
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email[0]?.toUpperCase() ||
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

export function TeamTableRow({ user }: { user: TeamRow }) {
  const router = useRouter()
  const [revoking, setRevoking] = useState(false)
  const displayName = user.resolved
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'Unresolved account'
  const href = `/settings/users/${user.id}`

  async function revokeGrant() {
    setRevoking(true)
    const result = await client.team.revoke(user.id)
    setRevoking(false)
    if (!result.error) router.refresh()
  }

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={() => router.push(href)}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') router.push(href)
      }}
      role="link"
      aria-label={`View team member ${displayName}`}
    >
      <TableCell className="py-4 pr-0 pl-5">
        <Avatar className="size-8">
          {user.avatar && <AvatarImage src={user.avatar} alt="" />}
          <AvatarFallback className="text-xs">{initialsOf(user)}</AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="px-5 py-4">
        <span className="font-medium">{displayName}</span>
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
        <Badge variant="outline">
          {AFFILIATION_LABELS[user.affiliation] ?? user.affiliation}
        </Badge>
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        <div className="flex items-center justify-between gap-3">
          <span>{formatExpiry(user.expiresAt, user.affiliation)}</span>
          {!user.resolved ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={revoking}
              onClick={(event) => {
                event.stopPropagation()
                void revokeGrant()
              }}
            >
              Revoke
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}
