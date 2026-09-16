import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ChartBarIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'

import { ProjectHealthBadge } from '../status-badges'
import type { HealthReport, ProjectHealthRow } from './types'

export type ProjectHealthTableProps = {
  report: HealthReport
  projectHrefBase: string
}

function projectHref(projectHrefBase: string, projectId: string): string {
  return `${projectHrefBase.replace(/\/$/, '')}/${encodeURIComponent(projectId)}`
}

function HealthBadge({ health }: { health: ProjectHealthRow['health'] }) {
  if (health === 'unknown') return <Badge variant="secondary">Unknown</Badge>
  return <ProjectHealthBadge health={health} />
}

function PercentCell({
  value,
  flagged = false,
}: {
  value: number | null
  flagged?: boolean
}) {
  return (
    <TableCell className="px-5 py-4 text-right tabular-nums">
      {value === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className={flagged ? 'text-destructive font-medium' : undefined}>
          {`${Math.round(value)}%`}
        </span>
      )}
    </TableCell>
  )
}

export function ProjectHealthTable({
  report,
  projectHrefBase,
}: ProjectHealthTableProps) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Project
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Health
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Progress
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Overdue
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Budget used
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ChartBarIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No projects to report</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            report.data.map((row) => (
              <TableRow key={row.projectId} className="transition-colors">
                <TableCell className="px-5 py-4">
                  <Link
                    className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    href={projectHref(projectHrefBase, row.projectId)}
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <HealthBadge health={row.health} />
                </TableCell>
                <PercentCell value={row.progressPercent} />
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  <span
                    className={
                      row.overdue > 0
                        ? 'text-destructive font-medium'
                        : undefined
                    }
                  >
                    {row.overdue}
                  </span>
                </TableCell>
                <PercentCell
                  value={row.budgetConsumedPercent}
                  flagged={
                    row.budgetConsumedPercent !== null &&
                    row.budgetConsumedPercent > 100
                  }
                />
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
