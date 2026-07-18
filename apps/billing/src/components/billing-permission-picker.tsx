'use client'

import { CheckCircle2 } from '@876/ui/icons'

import { BILLING_PERMISSION_GROUPS } from '@/lib/permissions'
import type { Permission } from '@/types/access'

export function PermissionPicker({
  selected,
  disabled,
  onToggle,
}: {
  selected: ReadonlySet<Permission>
  disabled?: boolean
  onToggle: (permission: Permission) => void
}) {
  return (
    <div className="876-card overflow-hidden">
      {BILLING_PERMISSION_GROUPS.map((group, index) => (
        <section
          key={group.label}
          className={index > 0 ? 'border-border border-t' : undefined}
        >
          <div className="bg-muted/25 border-border border-b px-5 py-3">
            <h3 className="text-xs font-semibold tracking-wide uppercase">
              {group.label}
            </h3>
          </div>
          <div className="bg-border grid gap-px sm:grid-cols-2">
            {group.permissions.map((permission) => {
              const checked = selected.has(permission.value)
              return (
                <button
                  key={permission.value}
                  type="button"
                  aria-pressed={checked}
                  disabled={disabled}
                  onClick={() => onToggle(permission.value)}
                  className="bg-876-surface hover:bg-muted/30 disabled:hover:bg-876-surface flex items-start gap-3 px-5 py-4 text-left transition-colors disabled:cursor-default"
                >
                  <span
                    className={
                      checked
                        ? 'bg-876-green mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white'
                        : 'border-border mt-0.5 size-5 shrink-0 rounded-full border'
                    }
                  >
                    {checked ? <CheckCircle2 className="size-3.5" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {permission.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                      {permission.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
