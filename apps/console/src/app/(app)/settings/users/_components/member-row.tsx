'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { TableCell, TableRow } from '@876/ui/table'

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  owner: 'Owner',
  super_admin: 'Super Admin',
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  super_admin:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  owner:
    'border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-400',
  admin: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  staff:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
}

function initialsOf(user: {
  first_name: string
  last_name: string
  email: string
}): string {
  return (
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    '?'
  )
}

export function TeamTableRow({
  user,
}: {
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
    username: string | null
    avatar: string | null
    role: string
  }
}) {
  const router = useRouter()
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || '—'
  const href = `/settings/users/${user.id}`

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={() => router.push(href)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') router.push(href)
      }}
      role="link"
      aria-label={`View team member ${displayName}`}
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
        <span className="font-medium">{displayName}</span>
        {user.username && (
          <p className="text-muted-foreground text-xs">@{user.username}</p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-sm">
        {user.email}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline" className={ROLE_BADGE_CLASS[user.role] ?? ''}>
          {ROLE_LABELS[user.role] ?? user.role}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
