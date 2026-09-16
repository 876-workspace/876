import { Badge } from '@876/ui/badge'
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

import { formatDay } from '../finance/format-money'
import { RUN_STATUS_LABELS } from './labels'
import type { AutomationRun } from './types'

export type AutomationRunTableProps = {
  runs: readonly AutomationRun[]
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${formatDay(timestamp)} ${hours}:${minutes} UTC`
}

function statusVariant(
  status: AutomationRun['status']
): 'success' | 'destructive' | 'secondary' {
  if (status === 'succeeded') return 'success'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

export function AutomationRunTable({ runs }: AutomationRunTableProps) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Rule
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Status
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Error
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Attempt
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Started
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Finished
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClockIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No automation runs yet</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => (
              <TableRow key={run.id} className="transition-colors">
                <TableCell className="px-5 py-4 font-mono text-xs">
                  {run.ruleId}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Badge variant={statusVariant(run.status)}>
                    {RUN_STATUS_LABELS[run.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4">
                  {run.errorCode === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="text-muted-foreground font-mono text-xs">
                      {run.errorCode}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {run.attempt}
                </TableCell>
                <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                  {formatTime(run.startedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                  {run.finishedAt === null ? (
                    <span>—</span>
                  ) : (
                    formatTime(run.finishedAt)
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
