'use client'

import type { Label } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { TagIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { MobileList, MobileListCell, MobileListEmpty } from './mobile-list'

export type LabelsTableProps = {
  labels: readonly Label[]
}

function LabelCell({ label }: { label: Label }) {
  return (
    <MobileListCell
      avatar={label.name.slice(0, 1).toUpperCase()}
      avatarStyle={{ backgroundColor: label.color }}
      title={label.name}
      subtitle={label.description || label.color}
    />
  )
}

export function LabelsTable({ labels }: LabelsTableProps) {
  return (
    <>
      <MobileList>
        {labels.length === 0 ? (
          <MobileListEmpty>No labels yet</MobileListEmpty>
        ) : (
          labels.map((label) => <LabelCell key={label.id} label={label} />)
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
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
    </>
  )
}
