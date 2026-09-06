'use client'

import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'

import { impliedPermissions, partitionPermissions } from './permission-surface'
import type { FinancePermissionKey, FinancePermissionSurface } from './types'

type Props = {
  surface: FinancePermissionSurface
  selected: readonly FinancePermissionKey[]
  /** Full role grants; used only to display grants outside this host's surface. */
  rolePermissions?: readonly FinancePermissionKey[]
  disabled?: boolean
  onChange: (permissions: FinancePermissionKey[]) => void
}

/** Editable finance grants grouped by module, with shared-product grants preserved. */
export function PermissionMatrixPanel({
  surface,
  selected,
  rolePermissions = selected,
  disabled = false,
  onChange,
}: Props) {
  const selectedSet = new Set(selected)
  const { external } = partitionPermissions(
    { permissions: [...rolePermissions] },
    surface
  )

  function change(
    next: Iterable<FinancePermissionKey>,
    changed?: FinancePermissionKey
  ) {
    onChange(impliedPermissions(next, surface, changed))
  }

  return (
    <div className="space-y-5">
      {surface.modules.map((module) => {
        const moduleKeys = module.permissions.map(
          (permission) => permission.key
        )
        const allSelected = moduleKeys.every((key) => selectedSet.has(key))
        return (
          <section
            key={module.key}
            aria-labelledby={`permission-module-${module.key}`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3
                id={`permission-module-${module.key}`}
                className="text-sm font-semibold"
              >
                {module.label}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || allSelected}
                  onClick={() => change(new Set([...selected, ...moduleKeys]))}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    disabled || !moduleKeys.some((key) => selectedSet.has(key))
                  }
                  onClick={() =>
                    change(selected.filter((key) => !moduleKeys.includes(key)))
                  }
                >
                  None
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {module.permissions.map((permission) => {
                const checked = selectedSet.has(permission.key)
                return (
                  <div
                    key={permission.key}
                    className="border-border flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled || permission.key === 'billing:access'}
                      onCheckedChange={(next) => {
                        const values = new Set(selected)
                        if (next) values.add(permission.key)
                        else values.delete(permission.key)
                        change(values, permission.key)
                      }}
                      aria-label={`${module.label}: ${permission.label}`}
                    />
                    <span>{permission.label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {external.length > 0 ? (
        <section
          className="border-border rounded-md border px-3 py-3"
          aria-label="External permissions"
        >
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Also granted in 876{' '}
            {surface.app === 'invoice' ? 'Billing' : 'Invoice'}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            These grants are kept when this role is saved.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {external.map((permission) => (
              <span
                key={permission}
                className="bg-muted rounded px-2 py-1 font-mono text-xs"
                aria-disabled="true"
              >
                {permission}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
