'use client'

import { cn } from '@876/core/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'

import { moduleStyle } from '@/components/patterns/permission-module-style'
import {
  permissionGroupRollup,
  permissionModuleRollup,
} from '@/lib/permission-grouping'
import type { PermissionGroup } from '@/types/permission'

type Props = {
  groups: readonly PermissionGroup[]
  selected: ReadonlySet<string>
  onToggle: (value: string) => void
  onSetGroup: (group: PermissionGroup, grant: boolean) => void
  className?: string
}

export function PermissionGroupPicker({
  groups,
  selected,
  onToggle,
  onSetGroup,
  className,
}: Props) {
  return (
    <Accordion
      multiple
      defaultValue={[]}
      className={cn(
        'border-876-surface-border bg-card/60 overflow-hidden rounded-xl border',
        className
      )}
    >
      {groups.map((group) => {
        const groupRollup = permissionGroupRollup(group, selected)
        const partiallySelected =
          groupRollup.granted > 0 && groupRollup.granted < groupRollup.total

        return (
          <AccordionItem key={group.key} value={group.key}>
            <AccordionTrigger className="hover:bg-muted/40 text-foreground cursor-pointer items-center rounded-none border-0 px-4 py-3 font-normal transition-colors hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                <span className="text-foreground truncate text-sm font-medium">
                  {group.label}
                </span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                  {groupRollup.granted}/{groupRollup.total}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-muted/10 px-4 pt-3 pb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span
                  aria-label={
                    partiallySelected
                      ? `${group.label} partially selected`
                      : undefined
                  }
                  aria-live="polite"
                  className="text-muted-foreground text-xs"
                >
                  {partiallySelected ? 'Partially selected' : 'Modules'}
                </span>
                <span className="flex gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => onSetGroup(group, true)}
                    className="text-foreground hover:text-primary focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetGroup(group, false)}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Clear
                  </button>
                </span>
              </div>
              <Accordion multiple className="space-y-2">
                {group.modules.map((module) => {
                  const { icon: Icon, tile } = moduleStyle(
                    group.key,
                    module.key
                  )
                  const moduleRollup = permissionModuleRollup(module, selected)

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
                          <span className="text-muted-foreground ms-auto shrink-0 pe-1 font-mono text-[0.6875rem] tabular-nums">
                            {moduleRollup.granted}/{moduleRollup.total}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="bg-muted/10 px-3 pt-2 pb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {module.permissions.map((permission) => {
                            const checked = selected.has(permission.value)
                            return (
                              <button
                                key={permission.value}
                                type="button"
                                onClick={() => onToggle(permission.value)}
                                aria-pressed={checked}
                                className={cn(
                                  'focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                                  checked
                                    ? 'border-border bg-background text-foreground shadow-2xs'
                                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50'
                                )}
                              >
                                <span
                                  className={cn(
                                    'size-1.5 shrink-0 rounded-full',
                                    checked
                                      ? 'bg-emerald-500 dark:bg-emerald-400'
                                      : 'bg-muted-foreground/50'
                                  )}
                                />
                                {permission.label}
                              </button>
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
        )
      })}
    </Accordion>
  )
}
