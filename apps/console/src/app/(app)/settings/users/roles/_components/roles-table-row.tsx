'use client'

import { useRouter } from 'next/navigation'
import type { RoleView } from '@/types/role'
import { Badge } from '@876/ui/badge'
import { TableCell, TableRow } from '@876/ui/table'

const ROLE_BADGE: Record<string, string> = {
  super_admin:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  admin: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  staff:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
  user: 'border-slate-400/40 bg-slate-200/60 text-slate-700 dark:border-slate-500/40 dark:bg-slate-700/40 dark:text-slate-300',
}

export function RolesTableRow({ role }: { role: RoleView }) {
  const router = useRouter()
  const href = `/settings/users/roles/${role.name}`

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={() => router.push(href)}
      tabIndex={0}
      role="link"
      aria-label={`Edit ${role.displayName} role`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') router.push(href)
      }}
    >
      <TableCell className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role.name] ?? 'border-purple-400/40 bg-purple-400/10 text-purple-700 dark:text-purple-400'}`}
          >
            {role.displayName}
          </span>
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
        <span className="text-muted-foreground text-sm">
          {role.permissions.length}{' '}
          {role.permissions.length === 1 ? 'permission' : 'permissions'}
        </span>
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <span className="text-muted-foreground text-sm">{role.userCount}</span>
      </TableCell>
    </TableRow>
  )
}
