import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ReceiptPercent } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatMoney } from '../finance/format-money'
import { formatDuration } from '../time-tracking'
import type { BudgetVarianceReport } from './types'

export type BudgetVarianceTableProps = {
  report: BudgetVarianceReport
}

function Money({
  minor,
  currency,
  negative = false,
}: {
  minor: string | null
  currency: string | null
  negative?: boolean
}) {
  const formatted =
    minor === null || currency === null ? null : formatMoney(minor, currency)
  if (formatted === null)
    return <span className="text-muted-foreground">—</span>
  return (
    <span className={negative ? 'text-destructive font-medium' : undefined}>
      {formatted}
    </span>
  )
}

export function BudgetVarianceTable({ report }: BudgetVarianceTableProps) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Project
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Budget
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Actual cost
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Variance
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Budget hours
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Actual hours
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
                      <ReceiptPercent className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No budgets to compare</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            report.data.map((row) => {
              const negative =
                row.varianceMinor !== null &&
                row.varianceMinor.trim().startsWith('-')

              return (
                <TableRow key={row.projectId} className="transition-colors">
                  <TableCell className="px-5 py-4 font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    <Money minor={row.budgetMinor} currency={row.currency} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    <Money
                      minor={row.actualCostMinor}
                      currency={row.currency}
                    />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    <Money
                      minor={row.varianceMinor}
                      currency={row.currency}
                      negative={negative}
                    />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {row.budgetMinutes === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatDuration(row.budgetMinutes)
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right tabular-nums">
                    {formatDuration(row.actualMinutes)}
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
