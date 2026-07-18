'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { AdminAddress } from '@876/admin'
import { Button } from '@876/ui/button'
import { Pencil, Star, Trash } from '@876/ui/icons'

import { formatDate } from '@/lib/format'
import { addressSummary, formatAddressType } from './address-utils'

export type AddressRowActions = {
  isPending: boolean
  onEdit: (address: AdminAddress) => void
  onDelete: (address: AdminAddress) => void
}

export function createAddressColumns(
  actions: AddressRowActions
): ColumnDef<AdminAddress, unknown>[] {
  return [
    {
      id: 'type-label',
      accessorFn: (address) => address.type,
      header: 'Type / Label',
      cell: ({ row }) => {
        const address = row.original

        return (
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {formatAddressType(address.type)}
            </p>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {address.label || '—'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'address',
      accessorFn: (address) => address.line1,
      header: 'Address',
      cell: ({ row }) => {
        const address = row.original

        return (
          <div className="max-w-[24rem] min-w-0">
            <p className="truncate text-sm">{address.line1 || '—'}</p>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {addressSummary(address)}
            </p>
          </div>
        )
      },
    },
    {
      id: 'default',
      accessorFn: (address) => address.is_default,
      header: () => <span className="block w-[7rem]">Default</span>,
      cell: ({ row }) => {
        const address = row.original

        return address.is_default ? (
          <Star
            aria-label="Default address"
            className="size-4 fill-current text-amber-500"
          />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      },
    },
    {
      id: 'created',
      accessorFn: (address) => address.created_at,
      header: () => <span className="block w-[9rem]">Created</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="block w-[8rem] text-right">Actions</span>,
      cell: ({ row }) => {
        const address = row.original

        return (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit address`}
              onClick={() => actions.onEdit(address)}
              disabled={actions.isPending}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete address`}
              onClick={() => actions.onDelete(address)}
              disabled={actions.isPending}
            >
              <Trash aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ]
}
