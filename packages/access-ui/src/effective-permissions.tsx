import { Badge } from '@876/ui/badge'

import type { AccessPermission } from './types'

type Props = {
  permissions: string[]
  catalog: AccessPermission[]
  emptyLabel?: string
}

type PermissionGroup = {
  key: string
  label: string
  permissions: string[]
}

function groupPermissions(
  permissions: readonly string[],
  catalog: readonly AccessPermission[]
): PermissionGroup[] {
  const catalogByKey = new Map(
    catalog.map((permission) => [permission.key, permission])
  )
  const groups = new Map<string, PermissionGroup>()

  for (const key of new Set(permissions)) {
    const permission = catalogByKey.get(key)
    const groupKey = permission?.moduleKey ?? '__unknown__'
    const group = groups.get(groupKey)

    if (group) {
      group.permissions.push(key)
      continue
    }

    groups.set(groupKey, {
      key: groupKey,
      label: permission?.moduleLabel ?? 'Unknown permissions',
      permissions: [key],
    })
  }

  return [...groups.values()]
}

export function EffectivePermissionList({
  permissions,
  catalog,
  emptyLabel = 'No effective permissions',
}: Props) {
  const groups = groupPermissions(permissions, catalog)
  const catalogByKey = new Map(
    catalog.map((permission) => [permission.key, permission])
  )

  if (groups.length === 0)
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>

  return (
    <div className="space-y-3" aria-label="Effective permissions">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h4 className="text-muted-foreground text-xs font-medium">
            {group.label}
          </h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {group.permissions.map((key) => {
              const permission = catalogByKey.get(key)

              return (
                <li key={key}>
                  <Badge variant={permission ? 'secondary' : 'warning'}>
                    {permission?.label ?? key}
                    {permission ? null : ' (unknown)'}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
