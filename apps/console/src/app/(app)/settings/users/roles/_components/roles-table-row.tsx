'use client'

import Link from 'next/link'
import { cn } from '@876/core/utils'
import type { RoleView } from '@/types/role'
import { Badge } from '@876/ui/badge'
import { TableCell, TableRow } from '@876/ui/table'

const ROLE_BADGE_FALLBACK =
  'border-purple-400/40 bg-purple-400/10 text-purple-700 dark:text-purple-400'

const ROLE_BADGE: Record<string, string> = {
  super_admin:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  admin: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  staff:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
  user: 'border-slate-400/40 bg-slate-200/60 text-slate-700 dark:border-slate-500/40 dark:bg-slate-700/40 dark:text-slate-300',
}

/**
 * The role's name rendered as its colour-coded badge.
 *
 * The colour is the role's identity, so it stays with the role in every form
 * of the list — the full table and the condensed sidebar alike. Dropping it
 * when the list collapses would leave the two views naming the same role in
 * two different visual languages.
 */
function RoleBadge({
  role,
  className,
}: {
  role: RoleView
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-[0.8125rem] font-medium',
        ROLE_BADGE[role.name] ?? ROLE_BADGE_FALLBACK,
        className
      )}
    >
      {role.displayName}
    </span>
  )
}

export function RolesTableRow({ role }: { role: RoleView }) {
  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-3.5">
        <RoleLink role={role} />
        <div className="flex items-center gap-2.5">
          <RoleBadge role={role} />
        </div>
        {role.description && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {role.description}
          </p>
        )}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        {role.isSystem ? (
          <Badge variant="outline" className="text-xs">
            System
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Custom
          </Badge>
        )}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <span className="text-muted-foreground text-[0.8125rem]">
          {role.permissions.length}{' '}
          {role.permissions.length === 1 ? 'permission' : 'permissions'}
        </span>
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <span className="text-muted-foreground text-[0.8125rem]">
          {role.userCount}
        </span>
      </TableCell>
    </TableRow>
  )
}

export function CondensedRolesTableRow({
  role,
  selected,
}: {
  role: RoleView
  selected: boolean
}) {
  return (
    <TableRow
      data-state={selected ? 'selected' : undefined}
      className={cn('transition-colors', selected && 'bg-muted/70 font-medium')}
    >
      <TableCell className="relative px-4 py-3">
        <RoleLink role={role} />
        <div className="min-w-0">
          <RoleBadge role={role} className="text-xs" />
          <p className="text-muted-foreground mt-1 truncate font-mono text-[0.6875rem]">
            {role.name}
          </p>
        </div>
      </TableCell>
    </TableRow>
  )
}

function RoleLink({ role }: { role: RoleView }) {
  return (
    <Link
      href={`/settings/users/roles/${encodeURIComponent(role.name)}`}
      aria-label={`Edit ${role.displayName} role`}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}
