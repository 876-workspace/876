'use client'

import type { AdminAddress } from '@876/admin'
import { Button } from '@876/ui/button'
import { Pencil, Star, Trash } from '@876/ui/icons'

import { formatDate } from '@/lib/format'
import type { AddressRowActions } from './addresses-columns'
import { addressSummary, formatAddressType } from './address-utils'

type Props = {
  addresses: AdminAddress[]
  actions: AddressRowActions
  emptyState: React.ReactNode
}

export function AddressesListView({ addresses, actions, emptyState }: Props) {
  if (addresses.length === 0) {
    return <div className="876-card">{emptyState}</div>
  }

  return (
    <div className="876-card divide-border divide-y overflow-hidden">
      {addresses.map((address) => {
        return (
          <div
            key={address.id}
            className="group hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 transition-colors"
          >
            <div className="w-5 shrink-0">
              {address.is_default && (
                <Star className="size-4 fill-amber-500 text-amber-500" />
              )}
            </div>

            <div className="flex w-32 min-w-0 flex-1 shrink-0 items-baseline gap-2 md:w-auto">
              <span className="truncate text-sm font-medium">
                {formatAddressType(address.type)}
              </span>
              {address.label && (
                <span className="text-muted-foreground truncate text-xs">
                  {address.label}
                </span>
              )}
            </div>

            <span className="text-muted-foreground hidden min-w-0 flex-1 truncate text-xs sm:block">
              {address.line1}, {addressSummary(address)}
            </span>

            <span className="text-muted-foreground/70 hidden w-24 shrink-0 text-right text-xs md:block">
              {formatDate(address.created_at)}
            </span>

            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit address`}
                onClick={() => actions.onEdit(address)}
                disabled={actions.isPending}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete address`}
                onClick={() => actions.onDelete(address)}
                disabled={actions.isPending}
              >
                <Trash className="size-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
