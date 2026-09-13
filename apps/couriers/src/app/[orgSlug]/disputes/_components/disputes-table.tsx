'use client'

import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ExclamationTriangleIcon } from '@876/ui/icons'

export type DisputeTableRow = {
  id: string
  date: string
  disputeNumber: string
  customer: string
  paymentNumber: string
  reason: string
  status: string
  orgSlug?: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

const columns: ColumnDef<DisputeTableRow, unknown>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.date}</span>
    ),
  },
  {
    accessorKey: 'disputeNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dispute #" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/${row.original.orgSlug}/disputes/${row.original.id}`}
        className="font-medium text-sky-600 dark:text-sky-400"
      >
        {row.original.disputeNumber}
      </Link>
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
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.paymentNumber}
      </span>
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
    cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
  },
]

export function DisputesTable({
  disputes,
  orgSlug,
}: {
  disputes: DisputeTableRow[]
  orgSlug: string
}) {
  const router = useRouter()
  const hrefFor = (id: string) => `/${orgSlug}/disputes/${id}`

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={disputes.map((dispute) => ({ ...dispute, orgSlug }))}
        rowClassName="cursor-pointer"
        onRowClick={(dispute) => router.push(hrefFor(dispute.id))}
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
