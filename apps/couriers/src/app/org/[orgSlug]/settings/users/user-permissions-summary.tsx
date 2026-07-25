'use client'

import { useState } from 'react'
import {
  CheckIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { SoftBadge } from '@/components/soft-badge'
import {
  PERMISSION_CATALOG,
  permissionKey,
  resolveRolePermissions,
} from '@/lib/permissions'
import type { TeamRoleOption } from '@/types/team'

export function UserPermissionsSummary({ role }: { role?: TeamRoleOption }) {
  const [search, setSearch] = useState('')

  if (!role) {
    return (
      <div className="border-876-surface-border flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
        <ShieldCheckIcon className="text-muted-foreground mb-2 size-8 opacity-60" />
        <p className="text-muted-foreground text-sm font-medium">
          This role is no longer available.
        </p>
      </div>
    )
  }

  const granted = new Set(resolveRolePermissions(role))

  // Calculate overall metrics
  let totalPossible = 0
  let totalGranted = 0

  const modulesWithPermissions = PERMISSION_CATALOG.map((module) => {
    const actionsWithStatus = module.actions.map((action) => {
      const key = permissionKey(module.key, action)
      const isGranted = granted.has(key)
      totalPossible++
      if (isGranted) totalGranted++

      return {
        key,
        label:
          action === 'view'
            ? 'View'
            : action.charAt(0).toUpperCase() + action.slice(1),
        isGranted,
      }
    })

    const extrasWithStatus = module.extras.map((extra) => {
      const key = permissionKey(module.key, extra.key)
      const isGranted = granted.has(key)
      totalPossible++
      if (isGranted) totalGranted++

      return {
        key,
        label: extra.label,
        isGranted,
      }
    })

    const grantedCount =
      actionsWithStatus.filter((a) => a.isGranted).length +
      extrasWithStatus.filter((e) => e.isGranted).length

    const totalCount = actionsWithStatus.length + extrasWithStatus.length

    return {
      ...module,
      actionsWithStatus,
      extrasWithStatus,
      grantedCount,
      totalCount,
      hasAnyGranted: grantedCount > 0,
    }
  })

  const query = search.trim().toLowerCase()
  const filteredModules = modulesWithPermissions.filter((mod) => {
    if (!query) return true
    if (mod.label.toLowerCase().includes(query)) return true
    if (
      mod.actionsWithStatus.some((a) => a.label.toLowerCase().includes(query))
    )
      return true
    if (mod.extrasWithStatus.some((e) => e.label.toLowerCase().includes(query)))
      return true
    return false
  })

  return (
    <div className="space-y-4">
      {/* Header Metrics & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SoftBadge
            tone={totalGranted > 0 ? 'emerald' : 'slate'}
            className="font-mono text-xs"
          >
            {totalGranted} / {totalPossible} Granted
          </SoftBadge>
          <span className="text-muted-foreground text-xs font-medium">
            ({Math.round((totalGranted / (totalPossible || 1)) * 100)}%
            coverage)
          </span>
        </div>

        <div className="relative w-full sm:w-56">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Filter permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-label="Clear filter"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Modules List */}
      <div className="grid gap-3">
        {filteredModules.map((module) => (
          <div
            key={module.key}
            className="border-876-surface-border bg-card/60 hover:bg-card/90 rounded-xl border p-3.5 transition-colors"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">
                  {module.label}
                </span>
              </div>
              <span
                className={`text-xs font-medium ${
                  module.grantedCount > 0
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {module.grantedCount} of {module.totalCount} active
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {module.actionsWithStatus.map((action) => (
                <span
                  key={action.key}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    action.isGranted
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-muted/40 text-muted-foreground/60 border border-transparent'
                  }`}
                >
                  {action.isGranted ? (
                    <CheckIcon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <LockClosedIcon className="size-3 shrink-0 opacity-40" />
                  )}
                  {action.label}
                </span>
              ))}

              {module.extrasWithStatus.map((extra) => (
                <span
                  key={extra.key}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    extra.isGranted
                      ? 'border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400'
                      : 'bg-muted/40 text-muted-foreground/60 border border-transparent'
                  }`}
                >
                  {extra.isGranted ? (
                    <CheckIcon className="size-3 shrink-0 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <LockClosedIcon className="size-3 shrink-0 opacity-40" />
                  )}
                  {extra.label}
                </span>
              ))}
            </div>
          </div>
        ))}

        {filteredModules.length === 0 ? (
          <div className="border-876-surface-border flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-xs font-medium">
              No permissions found matching &quot;{search}&quot;.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
