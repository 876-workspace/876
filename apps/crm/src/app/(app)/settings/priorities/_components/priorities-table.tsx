'use client'

import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { PriorityTag } from '@/features/priorities/priority-tag'
import type { RequestPriority } from '@/types/crm'

/** The full-width priorities list, shown when no priority is selected. */
export function PrioritiesTable({
  priorities,
  onSelect,
}: {
  priorities: RequestPriority[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="w-56 px-5 py-3.5">Priority</TableHead>
            <TableHead className="px-5 py-3.5">Description</TableHead>
            <TableHead className="w-32 px-5 py-3.5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {priorities.map((priority) => (
            <TableRow
              key={priority.id}
              className="hover:bg-muted/40 cursor-pointer transition-colors"
              onClick={() => onSelect(priority.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(priority.id)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View priority ${priority.name}`}
            >
              <TableCell className="w-56 px-5 py-4">
                <span className="flex items-center gap-2">
                  <PriorityTag name={priority.name} color={priority.color} />
                  {priority.isDefault ? (
                    <Badge variant="info">Default</Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  'text-muted-foreground w-full px-5 py-4 text-[0.8125rem] whitespace-normal',
                  !priority.description && 'text-muted-foreground/60'
                )}
              >
                {priority.description || '—'}
              </TableCell>
              <TableCell className="w-32 px-5 py-4">
                <Badge variant={priority.isActive ? 'success' : 'secondary'}>
                  {priority.isActive ? 'Active' : 'Archived'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
