'use client'

import { useMemo, useState } from 'react'
import { Button } from '@876/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import {
  AlertCircle,
  Building2,
  ChartPieIcon,
  CircleStackIcon,
  CreditCardIcon,
  Fingerprint,
  KeyIcon,
  Link2,
  Lock,
  ShieldCheck,
  SquaresPlusIcon,
  Terminal,
  Users,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { PERMISSION_GROUPS } from '@/lib/permissions'

/**
 * Per-module identity: its icon and its tile colour.
 *
 * Colour here is *identity*, not state — a module keeps the same hue whatever
 * the operator holds, so the list stays scannable by shape and colour rather
 * than turning into a grey wall for a low-privilege role. How much of a module
 * is held is carried by the granted/total count beside it.
 *
 * Emerald is deliberately absent: it means "granted" on the permission pills,
 * and reusing it for a module would make the two readings compete.
 */
const MODULE_STYLE: Record<string, { icon: typeof KeyIcon; tile: string }> = {
  console: {
    icon: Terminal,
    tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
  },
  users: {
    icon: Users,
    tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  },
  organizations: {
    icon: Building2,
    tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  },
  memberships: {
    icon: Link2,
    tile: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-400',
  },
  apps: {
    icon: SquaresPlusIcon,
    tile: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400',
  },
  roles: {
    icon: ShieldCheck,
    tile: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  },
  team: {
    icon: Fingerprint,
    tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  },
  storage: {
    icon: CircleStackIcon,
    tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  reports: {
    icon: ChartPieIcon,
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  billing: {
    icon: CreditCardIcon,
    tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
  },
}

const FALLBACK_STYLE = {
  icon: KeyIcon,
  tile: 'bg-muted text-muted-foreground ring-border/60',
}

/** Resolves a catalog module label to its icon and tile colour. */
function moduleStyle(label: string) {
  return MODULE_STYLE[label.toLowerCase()] ?? FALLBACK_STYLE
}

type Row = { value: string; label: string; granted: boolean }
type Module = {
  label: string
  rows: Row[]
  granted: number
  total: number
}

type Props = {
  permissions: readonly string[]
  /**
   * Whether the viewer may revoke this grant. The revoke button also needs an
   * `onRevoke` handler, so a read-only render — a server component with no
   * handler to pass — cannot produce a dead button.
   */
  canRevoke?: boolean
  revoking?: boolean
  onRevoke?: () => void
}

export function AccessPanel({
  permissions,
  canRevoke = true,
  revoking = false,
  onRevoke,
}: Props) {
  const [open, setOpen] = useState<string[]>([])

  const held = useMemo(() => new Set(permissions), [permissions])

  const modules = useMemo<Module[]>(
    () =>
      PERMISSION_GROUPS.map((group) => {
        const rows: Row[] = group.permissions.map((permission) => ({
          value: permission.value,
          label: permission.label,
          granted: held.has(permission.value),
        }))

        return {
          label: group.label,
          rows,
          granted: rows.filter((row) => row.granted).length,
          total: rows.length,
        }
      }),
    [held]
  )

  return (
    <div className="-m-6 flex flex-col">
      <Accordion
        multiple
        value={open}
        onValueChange={(next) => setOpen(next as string[])}
        className="border-876-surface-border w-full border-b"
      >
        {modules.map((module) => {
          const { icon: Icon, tile } = moduleStyle(module.label)

          return (
            <AccordionItem
              key={module.label}
              value={module.label}
              className="border-876-surface-border not-last:border-b"
            >
              <AccordionTrigger className="hover:bg-muted/40 items-center gap-3 px-6 py-3 hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                      tile
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="text-foreground truncate text-sm font-medium">
                    {module.label}
                  </span>

                  <span className="text-muted-foreground ms-auto shrink-0 pe-1 font-mono text-[0.6875rem] tabular-nums">
                    {`${module.granted}/${module.total}`}
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="bg-muted/10 px-6 pt-3 pb-5">
                <div className="flex flex-wrap gap-2">
                  {module.rows.map((row) => (
                    <span
                      key={row.value}
                      title={row.value}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        row.granted
                          ? 'border-border bg-background text-foreground shadow-2xs'
                          : 'border-border/40 bg-muted/20 text-muted-foreground/40 line-through'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          row.granted
                            ? 'bg-emerald-500 shadow-xs'
                            : 'bg-muted-foreground/30'
                        )}
                      />
                      {row.label}
                      <span className="sr-only">
                        {row.granted ? 'Granted' : 'Not granted'}
                      </span>
                    </span>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Danger zone */}
      <div className="p-6">
        <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-4 sm:p-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-destructive size-4 shrink-0" />
                <h3 className="text-foreground text-sm font-semibold">
                  Revoke Console Access
                </h3>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Immediately revokes this member&apos;s access grant and
                terminates all active Console sessions.
              </p>
            </div>

            {canRevoke && onRevoke ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={revoking}
                onClick={onRevoke}
                className="shrink-0 self-start sm:self-auto"
              >
                {revoking ? 'Revoking…' : 'Revoke Access'}
              </Button>
            ) : (
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 self-start text-xs sm:self-auto">
                <Lock className="size-3.5" />
                Not permitted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
