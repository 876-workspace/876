import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ClockIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'

import { formatDay } from '@876/projects-ui/finance/format-money'

import { formatMinutesAsHours } from '../capacity-input'

import type { CapacityRow } from '@/types/reporting'

export type { CapacityRow }

function editHref(capacityId: string): string {
  return `/settings/capacity/${encodeURIComponent(capacityId)}/edit`
}

export function CapacityTable({ rows }: { rows: CapacityRow[] }) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Member
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Hours per week
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Effective from
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Effective to
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClockIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No capacity recorded</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className="transition-colors">
                <TableCell className="px-5 py-4 font-medium">
                  {row.member}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {`${formatMinutesAsHours(row.minutesPerWeek)}h`}
                </TableCell>
                <TableCell className="px-5 py-4">
                  {formatDay(row.effectiveFrom)}
                </TableCell>
                <TableCell className="px-5 py-4">
                  {row.effectiveTo === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatDay(row.effectiveTo)
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-right">
                  <Link
                    className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    href={editHref(row.id)}
                  >
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
