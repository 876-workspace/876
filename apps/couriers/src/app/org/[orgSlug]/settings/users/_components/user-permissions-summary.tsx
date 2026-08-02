import {
  PERMISSION_CATALOG,
  permissionKey,
  resolveRolePermissions,
} from '@/lib/permissions'
import type { TeamRoleOption } from '@/types/team'

export function UserPermissionsSummary({ role }: { role?: TeamRoleOption }) {
  if (!role)
    return (
      <p className="text-muted-foreground text-sm">
        This role is no longer available.
      </p>
    )

  const granted = new Set(resolveRolePermissions(role))

  return (
    <div className="divide-border divide-y">
      {PERMISSION_CATALOG.map((module) => {
        const labels = [
          ...module.actions
            .filter((action) => granted.has(permissionKey(module.key, action)))
            .map((action) =>
              action === 'view'
                ? 'View'
                : action.charAt(0).toUpperCase() + action.slice(1)
            ),
          ...module.extras
            .filter((extra) =>
              granted.has(permissionKey(module.key, extra.key))
            )
            .map((extra) => extra.label),
        ]

        return (
          <div
            key={module.key}
            className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-4"
          >
            <span className="text-sm font-medium">{module.label}</span>
            <span className="text-muted-foreground text-sm">
              {labels.length > 0 ? labels.join(', ') : 'No access'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
