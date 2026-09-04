'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { cn } from '@876/core/utils'

import type { PermissionGroup } from '@/types/permission'

type Props = {
  groups: readonly PermissionGroup[]
  selected: ReadonlySet<string>
  onToggle: (value: string) => void
  className?: string
}

export function PermissionGroupPicker({
  groups,
  selected,
  onToggle,
  className,
}: Props) {
  return (
    <Accordion
      multiple
      defaultValue={[]}
      className={cn(
        'border-border bg-card/60 overflow-hidden rounded-lg border',
        className
      )}
    >
      {groups.map((group) => {
        const checkedCount = group.permissions.filter((p) =>
          selected.has(p.value)
        ).length

        return (
          <AccordionItem key={group.label} value={group.label}>
            <AccordionTrigger className="bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 text-foreground cursor-pointer items-center rounded-none border-0 px-4 py-2.5 font-normal transition-colors hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                <span className="876-eyebrow truncate">{group.label}</span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                  {checkedCount}/{group.permissions.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-2.5">
              <div className="flex flex-wrap gap-1.5">
                {group.permissions.map((perm) => {
                  const checked = selected.has(perm.value)
                  return (
                    <button
                      key={perm.value}
                      type="button"
                      onClick={() => onToggle(perm.value)}
                      aria-pressed={checked}
                      className={`focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                        checked
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50'
                      }`}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600 dark:bg-blue-400' : 'bg-muted-foreground/50'}`}
                      />
                      {perm.label}
                    </button>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
