'use client'

import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import {
  recurringInvoiceStatusVariant,
  type RecurringInvoiceStatus,
} from './document-status'
import { Link } from './link'

export type { RecurringInvoiceStatus }

export interface RecurringInvoiceRow {
  id: string
  profileName: string
  customer: { name: string }
  frequency: { intervalUnit: string; intervalCount: number }
  totalAmount: bigint | string
  currency: string
  status: RecurringInvoiceStatus
  nextRunAt: number | null
  lastRunAt: number | null
  generatedCount: number
}

export interface RecurringInvoicesListProps {
  profiles: RecurringInvoiceRow[]
  baseHref: string
  formatAmount: (amount: bigint | string, currency: string) => string
  formatDate: (timestamp: number) => string
  emptyState?: ReactNode
}

const INTERVAL_UNITS: Record<string, { singular: string; plural: string }> = {
  day: { singular: 'day', plural: 'days' },
  week: { singular: 'week', plural: 'weeks' },
  month: { singular: 'month', plural: 'months' },
  year: { singular: 'year', plural: 'years' },
}

/** One shared frequency label so Billing and Invoice cannot word it differently. */
export function formatRecurringFrequency(
  intervalUnit: string,
  intervalCount: number
): string {
  const unit = INTERVAL_UNITS[intervalUnit.toLowerCase()]
  if (!unit || !Number.isInteger(intervalCount) || intervalCount < 1)
    return 'Recurring'
  if (intervalCount === 1) return `Every ${unit.singular}`
  return `Every ${intervalCount} ${unit.plural}`
}

function formatRunAt(
  value: number | null,
  formatDate: (timestamp: number) => string
): ReactNode {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>
  return (
    <span className="text-muted-foreground text-xs">{formatDate(value)}</span>
  )
}

/** Shared Billing/Invoice list-detail presentation for recurring invoice profiles. */
export function RecurringInvoicesList({
  profiles,
  baseHref,
  formatAmount,
  formatDate,
  emptyState,
}: RecurringInvoicesListProps) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  if (!selectedId)
    return (
      <RecurringInvoicesTable
        profiles={profiles}
        baseHref={baseHref}
        formatAmount={formatAmount}
        formatDate={formatDate}
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Recurring Invoices</ListPaneHeader>
      <ListPaneBody>
        {profiles.length === 0 ? (
          <ListPaneEmpty>No recurring invoices yet</ListPaneEmpty>
        ) : (
          profiles.map((profile) => (
            <ListPaneItem
              key={profile.id}
              href={
                query
                  ? `${baseHref}/${profile.id}?${query}`
                  : `${baseHref}/${profile.id}`
              }
              selected={profile.id === selectedId}
              label={`View recurring invoice ${profile.profileName}`}
              title={profile.profileName}
              subtitle={`${profile.customer.name} · ${formatRecurringFrequency(
                profile.frequency.intervalUnit,
                profile.frequency.intervalCount
              )}`}
              trailing={
                <Badge variant={recurringInvoiceStatusVariant(profile.status)}>
                  <span className="capitalize">{profile.status}</span>
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function RecurringInvoicesTable({
  profiles,
  baseHref,
  formatAmount,
  formatDate,
  emptyState,
}: RecurringInvoicesListProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`
  const columns: ColumnDef<RecurringInvoiceRow, unknown>[] = [
    {
      id: 'profile',
      accessorKey: 'profileName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Profile" />
      ),
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.profileName}
        </Link>
      ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customer.name,
    },
    {
      id: 'frequency',
      accessorFn: (row) =>
        formatRecurringFrequency(
          row.frequency.intervalUnit,
          row.frequency.intervalCount
        ),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Frequency" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatRecurringFrequency(
            row.original.frequency.intervalUnit,
            row.original.frequency.intervalCount
          )}
        </span>
      ),
    },
    {
      id: 'nextRun',
      accessorKey: 'nextRunAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Next run" />
      ),
      cell: ({ row }) => formatRunAt(row.original.nextRunAt, formatDate),
    },
    {
      id: 'lastRun',
      accessorKey: 'lastRunAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last run" />
      ),
      cell: ({ row }) => formatRunAt(row.original.lastRunAt, formatDate),
    },
    {
      id: 'total',
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Total"
          className="text-right"
        />
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatAmount(row.original.totalAmount, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={recurringInvoiceStatusVariant(row.original.status)}>
          <span className="capitalize">{row.original.status}</span>
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={profiles}
        onRowClick={(profile) => router.push(hrefFor(profile.id))}
      />
    </div>
  )
}
