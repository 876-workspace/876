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

import type { ImportRowPreview } from './types'

export type ImportPreviewTableProps = {
  rows: readonly ImportRowPreview[]
}

function sortedRows(rows: readonly ImportRowPreview[]): ImportRowPreview[] {
  return [...rows].sort((a, b) => {
    if (a.status === b.status) return a.rowNumber - b.rowNumber
    return a.status === 'invalid' ? -1 : 1
  })
}

export function ImportPreviewTable({ rows }: ImportPreviewTableProps) {
  const ordered = sortedRows(rows)

  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Row
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Title
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Status
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Errors
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClockIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No rows to preview</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            ordered.map((row) => (
              <TableRow key={row.rowNumber} className="transition-colors">
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {row.rowNumber}
                </TableCell>
                <TableCell className="px-5 py-4 text-sm">
                  {row.title === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    row.title
                  )}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Badge variant={row.status === 'valid' ? 'success' : 'destructive'}>
                    {row.status === 'valid' ? 'Valid' : 'Invalid'}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm">
                  {row.errors.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ul className="list-disc space-y-1 pl-4">
                      {row.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
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
