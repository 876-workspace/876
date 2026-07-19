import type {
  BillingCustomerImportResult,
  BillingCustomerImportRowResult,
} from '@876/billing/integration'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

type Props = {
  result: BillingCustomerImportResult
}

export function ImportSummaryCounts({ result }: Props) {
  const counts = [
    ['Created', result.summary.created],
    ['Updated', result.summary.updated],
    ['Skipped', result.summary.skipped],
    ['Failed', result.summary.failed],
  ] as const

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {counts.map(([label, count]) => (
        <div key={label} className="rounded-lg border p-4">
          <div className="text-muted-foreground text-xs">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {count}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ImportResults({ result }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Row</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Matched customer</TableHead>
            <TableHead className="pr-5">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.results.map((row) => (
            <ResultRow key={row.rowNumber} row={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ResultRow({ row }: { row: BillingCustomerImportRowResult }) {
  const failed = row.action === 'failed' || row.error !== null

  return (
    <TableRow className={failed ? 'bg-destructive/5' : undefined}>
      <TableCell className="pl-5 tabular-nums">{row.rowNumber}</TableCell>
      <TableCell className={failed ? 'text-destructive font-medium' : ''}>
        {capitalize(row.action)}
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs">
        {row.customerId ?? '—'}
      </TableCell>
      <TableCell className="text-destructive pr-5 text-sm">
        {row.error?.message ?? '—'}
      </TableCell>
    </TableRow>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
