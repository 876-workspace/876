'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

export type CrmCustomerRow = {
  profileId: string
  /** The party's name — the company for a business, the person otherwise. */
  name: string
  isBusiness: boolean
  /** The party's own email. For a business, never the contact's. */
  email: string | null
  phone: string | null
  /** The person attached to a business customer. Null for an individual. */
  contactName: string | null
  contactEmail: string | null
  /** `876 organization`, `876 user`, or `External customer`. */
  typeLabel: string
  status: 'ACTIVE' | 'INACTIVE'
}

type Props = {
  customers: CrmCustomerRow[]
  /** Base href of the workspace's customers section. */
  customersHref: string
}

const emptyState = (
  <Empty className="py-14">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <UsersIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>No customers</EmptyTitle>
    </EmptyHeader>
  </Empty>
)

/**
 * An organization's CRM customers, as Console sees them.
 *
 * The row is about the **party**; the contact is its own column. Reading the
 * contact's address into the party's email cell is the defect
 * `.claude/rules/customer-architecture.md` calls out by name — it renders an
 * organization with its owner's personal address attached.
 */
export function CustomersTable({ customers, customersHref }: Props) {
  const router = useRouter()

  const columns: ColumnDef<CrmCustomerRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <CustomerAvatar name={row.original.name} />
          <div className="min-w-0">
            <Link
              href={`${customersHref}/${row.original.profileId}`}
              className="block truncate font-medium hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.name}
            </Link>
            {row.original.email ? (
              <span className="text-muted-foreground block truncate text-xs">
                {row.original.email}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contactName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      // An individual is their own contact, so the cell stays empty for them
      // rather than repeating the name already in the first column.
      cell: ({ row }) =>
        row.original.isBusiness && row.original.contactName ? (
          <div className="min-w-0">
            <p className="truncate">{row.original.contactName}</p>
            {row.original.contactEmail ? (
              <p className="text-muted-foreground truncate text-xs">
                {row.original.contactEmail}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'typeLabel',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.typeLabel}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}
        >
          {row.original.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={customers}
        emptyState={emptyState}
        onRowClick={(customer) =>
          router.push(`${customersHref}/${customer.profileId}`)
        }
      />
    </div>
  )
}
