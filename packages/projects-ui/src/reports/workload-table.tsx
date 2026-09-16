import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatDuration } from '../time-tracking'
import type { WorkloadReport } from './types'

export type WorkloadTableProps = {
  report: WorkloadReport
}

export function WorkloadTable({ report }: WorkloadTableProps) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Member
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Assigned
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Planned
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Logged
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Capacity
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Utilisation
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No assigned work</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            report.data.map((row) => {
              const overCapacity =
                row.utilisationPercent !== null && row.utilisationPercent > 100

              return (
                <TableRow key={row.userId} className="transition-colors">
                  <TableCell className="px-5 py-4 font-medium">
                    {row.label}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {row.assignedOpenItems}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {formatDuration(row.plannedMinutes)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {formatDuration(row.loggedMinutes)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {row.capacityMinutes === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatDuration(row.capacityMinutes)
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {row.utilisationPercent === null ? (
                      <span className="text-muted-foreground">No capacity</span>
                    ) : (
                      <span
                        className={
                          overCapacity
                            ? 'text-destructive font-medium'
                            : undefined
                        }
                      >
                        {`${Math.round(row.utilisationPercent)}%`}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
