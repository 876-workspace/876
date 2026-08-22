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
import { CreditCardIcon } from '@876/ui/icons'

type PaymentTableRow = {
  id: string
  date: string
  paymentNumber: string
  customer: string
  packageNumber: string
  mode: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

const columns: ColumnDef<PaymentTableRow, unknown>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
  },
  {
    accessorKey: 'paymentNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment #" />
    ),
  },
  {
    accessorKey: 'customer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
  },
  {
    accessorKey: 'packageNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Package #" />
    ),
  },
  {
    accessorKey: 'mode',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mode" />
    ),
  },
]

export function PaymentsTable({ emptyMessage }: { emptyMessage: string }) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={[]}
        emptyState={
          <Empty className="border-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>No payments</EmptyTitle>
              <EmptyDescription>{emptyMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
