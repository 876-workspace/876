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

import type { UnmappedField } from './types'

export type UnmappedFieldsTableProps = {
  fields: readonly UnmappedField[]
}

export function UnmappedFieldsTable({ fields }: UnmappedFieldsTableProps) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Source
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Field
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Occurrences
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClockIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No unmapped fields</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            fields.map((field) => (
              <TableRow
                key={`${field.source}:${field.field}`}
                className="transition-colors"
              >
                <TableCell className="px-5 py-4 text-sm">{field.source}</TableCell>
                <TableCell className="px-5 py-4 font-mono text-xs">
                  {field.field}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {field.occurrences}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
