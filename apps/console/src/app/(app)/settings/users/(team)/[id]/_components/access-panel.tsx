'use client'

import { useMemo, useState } from 'react'
import { Button } from '@876/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { AlertCircle, Lock } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { moduleStyle } from '@/components/patterns/permission-module-style'
import {
  permissionGroupRollup,
  permissionModuleRollup,
} from '@/lib/permission-grouping'
import { PERMISSION_GROUPS } from '@/lib/permissions'

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

  const groups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => {
        return {
          ...group,
          rollup: permissionGroupRollup(group, held),
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
        {groups.map((group) => (
          <AccordionItem
            key={group.key}
            value={group.key}
            className="border-876-surface-border not-last:border-b"
          >
            <AccordionTrigger className="hover:bg-muted/40 items-center gap-3 px-6 py-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="text-foreground truncate text-sm font-medium">
                  {group.label}
                </span>

                <span className="text-muted-foreground ms-auto shrink-0 pe-1 font-mono text-[0.6875rem] tabular-nums">
                  {`${group.rollup.granted}/${group.rollup.total}`}
                </span>
              </span>
            </AccordionTrigger>

            <AccordionContent className="bg-muted/10 px-6 pt-3 pb-5">
              <Accordion multiple className="space-y-2">
                {group.modules.map((module) => {
                  const { icon: Icon, tile } = moduleStyle(
                    group.key,
                    module.key
                  )
                  const rollup = permissionModuleRollup(module, held)

                  return (
                    <AccordionItem
                      key={module.key}
                      value={`${group.key}-${module.key}`}
                      className="border-border/60 overflow-hidden rounded-xl border"
                    >
                      <AccordionTrigger className="hover:bg-muted/40 items-center gap-3 px-3 py-2.5 hover:no-underline">
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
                          <span className="text-muted-foreground ms-auto shrink-0 pe-1 font-mono text-[0.6875rem] tabular-nums">{`${rollup.granted}/${rollup.total}`}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="bg-muted/10 px-3 pt-2 pb-3">
                        <div className="flex flex-wrap gap-2">
                          {module.permissions.map((permission) => {
                            const granted = held.has(permission.value)
                            return (
                              <span
                                key={permission.value}
                                title={permission.value}
                                className={cn(
                                  'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                                  granted
                                    ? 'border-border bg-background text-foreground shadow-2xs'
                                    : 'border-border/40 bg-muted/20 text-muted-foreground/40 line-through'
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    'size-1.5 shrink-0 rounded-full',
                                    granted
                                      ? 'bg-emerald-500 shadow-xs'
                                      : 'bg-muted-foreground/30'
                                  )}
                                />
                                {permission.label}
                                <span className="sr-only">
                                  {granted ? 'Granted' : 'Not granted'}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
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
