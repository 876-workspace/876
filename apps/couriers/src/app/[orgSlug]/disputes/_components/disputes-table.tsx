'use client'

import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { DataTable } from '@876/ui/data-table'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ExclamationTriangleIcon } from '@876/ui/icons'

type DisputeTableRow = {
  id: string
  date: string
  disputeNumber: string
  customer: string
  paymentNumber: string
  reason: string
  status: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

const columns: ColumnDef<DisputeTableRow, unknown>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
  },
  {
    accessorKey: 'disputeNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dispute #" />
    ),
  },
  {
    accessorKey: 'customer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
  },
  {
    accessorKey: 'paymentNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment #" />
    ),
  },
  {
    accessorKey: 'reason',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
  },
]

export function DisputesTable() {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={[]}
        emptyState={
          <Empty className="border-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ExclamationTriangleIcon />
              </EmptyMedia>
              <EmptyTitle>No disputes</EmptyTitle>
              <EmptyDescription>
                No disputes have been reported yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
