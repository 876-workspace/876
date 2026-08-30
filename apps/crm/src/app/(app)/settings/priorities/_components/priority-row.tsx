'use client'

import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { TableCell, TableRow } from '@876/ui/table'
import type { RequestPriority } from '@/types/crm'

export function CondensedPriorityRow({
  priority,
  selected,
  onSelect,
}: {
  priority: RequestPriority
  selected?: boolean
  onSelect: () => void
}) {
  return (
    <TableRow
      className={cn(
        'hover:bg-muted/40 cursor-pointer transition-colors',
        selected && 'bg-muted/60'
      )}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role="button"
      aria-label={`View priority ${priority.name}`}
      aria-pressed={selected}
    >
      <TableCell className="py-3 pr-3 pl-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="bg-muted size-3 shrink-0 rounded-full border"
            style={
              priority.color
                ? {
                    backgroundColor: priority.color,
                    borderColor: priority.color,
                  }
                : undefined
            }
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={cn(
                  'truncate text-[0.8125rem] font-medium text-sky-600 dark:text-sky-400',
                  selected && 'font-semibold'
                )}
              >
                {priority.name}
              </span>
              {priority.isDefault ? (
                <Badge variant="info" className="h-4 px-1 py-0 text-[0.625rem]">
                  Default
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground truncate text-[0.6875rem]">
                Severity {priority.weight} · Order {priority.sortOrder}
              </span>
              {!priority.isActive ? (
                <span className="text-muted-foreground text-[0.625rem]">
                  · Archived
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
