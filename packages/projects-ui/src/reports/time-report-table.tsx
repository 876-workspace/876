import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ClockIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatDuration } from '../time-tracking'
import type { TimeReport, TimeReportRow } from './types'

export type TimeReportTableProps = {
  report: TimeReport
}

const GROUP_LABEL: Record<TimeReport['groupBy'], string> = {
  project: 'Project',
  user: 'Member',
  issue: 'Issue',
}

function totals(rows: readonly TimeReportRow[]) {
  return rows.reduce(
    (sum, row) => ({
      billableMinutes: sum.billableMinutes + row.billableMinutes,
      nonBillableMinutes: sum.nonBillableMinutes + row.nonBillableMinutes,
    }),
    { billableMinutes: 0, nonBillableMinutes: 0 }
  )
}

export function TimeReportTable({ report }: TimeReportTableProps) {
  const sum = totals(report.data)

  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              {GROUP_LABEL[report.groupBy]}
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Billable
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Non-billable
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClockIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No time logged</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            report.data.map((row) => (
              <TableRow key={row.key} className="transition-colors">
                <TableCell className="px-5 py-4 font-medium">
                  {row.label}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {formatDuration(row.billableMinutes)}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {formatDuration(row.nonBillableMinutes)}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {formatDuration(row.billableMinutes + row.nonBillableMinutes)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {report.data.length === 0 ? null : (
          <TableFooter>
            <TableRow>
              <TableCell className="px-5 py-4 font-medium">Total</TableCell>
              <TableCell className="px-5 py-4 text-right tabular-nums">
                {formatDuration(sum.billableMinutes)}
              </TableCell>
              <TableCell className="px-5 py-4 text-right tabular-nums">
                {formatDuration(sum.nonBillableMinutes)}
              </TableCell>
              <TableCell className="px-5 py-4 text-right tabular-nums">
                {formatDuration(sum.billableMinutes + sum.nonBillableMinutes)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}
