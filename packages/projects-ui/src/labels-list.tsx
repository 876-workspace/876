'use client'

import type { Label } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { TagIcon } from '@876/ui/icons'
import { ResponsiveList, type ListRowMapping } from '@876/ui/responsive-list'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

export type LabelsTableProps = {
  labels: readonly Label[]
}

const labelRow: ListRowMapping<Label> = {
  key: (label) => label.id,
  leading: (label) => (
    <span
      aria-hidden="true"
      className="size-3 rounded-full"
      style={{ backgroundColor: label.color }}
    />
  ),
  title: (label) => label.name,
  subtitle: (label) => label.description || undefined,
}

export function LabelsTable({ labels }: LabelsTableProps) {
  return (
    <ResponsiveList
      rows={labels}
      mapping={labelRow}
      empty={
        <li className="text-muted-foreground px-4 py-10 text-center text-sm">
          No labels yet
        </li>
      }
      table={
        <div className="876-card overflow-hidden">
          <Table>
            <TableHeader className="876-header-row">
              <TableRow>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Label
                </TableHead>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Color
                </TableHead>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-0">
                    <Empty className="py-14">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <TagIcon className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>No labels yet</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                labels.map((label) => (
                  <TableRow key={label.id} className="transition-colors">
                    <TableCell className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className="gap-1.5 font-medium"
                        style={{ borderColor: label.color }}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                          aria-hidden="true"
                        />
                        {label.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                      {label.color}
                    </TableCell>
                    <TableCell className="text-muted-foreground px-5 py-4 text-xs">
                      {label.description || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      }
    />
  )
}
