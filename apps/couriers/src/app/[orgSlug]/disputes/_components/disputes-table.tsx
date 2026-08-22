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

const columns: ColumnDef<DisputeTableRow, unknown>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'disputeNumber', header: 'Dispute #' },
  { accessorKey: 'customer', header: 'Customer' },
  { accessorKey: 'paymentNumber', header: 'Payment #' },
  { accessorKey: 'reason', header: 'Reason' },
  { accessorKey: 'status', header: 'Status' },
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
