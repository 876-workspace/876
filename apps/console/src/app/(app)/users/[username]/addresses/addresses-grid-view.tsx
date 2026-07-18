'use client'

import type { AdminAddress } from '@876/admin'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MapPin, MoreHorizontalIcon, Pencil, Star, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { formatDate } from '@/lib/format'
import type { AddressRowActions } from './addresses-columns'
import { addressSummary, formatAddressType } from './address-utils'

type Props = {
  addresses: AdminAddress[]
  actions: AddressRowActions
  emptyState: React.ReactNode
}

export function AddressesGridView({ addresses, actions, emptyState }: Props) {
  if (addresses.length === 0) {
    return <div className="876-card">{emptyState}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {addresses.map((address) => {
        const typeLabel = formatAddressType(address.type)
        return (
          <div
            key={address.id}
            className="876-card shadow-876-sm relative flex flex-col p-4"
          >
            {address.is_default && (
              <Star className="absolute top-4 left-4 size-4 fill-amber-500 text-amber-500" />
            )}
            <div className="flex items-start gap-3 pl-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{typeLabel}</p>
                {address.label && (
                  <p className="text-muted-foreground truncate text-xs">
                    {address.label}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                    '-mt-1 -mr-1'
                  )}
                  aria-label={`Actions for address`}
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-36">
                  <DropdownMenuItem
                    onClick={() => actions.onEdit(address)}
                    disabled={actions.isPending}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.onDelete(address)}
                    disabled={actions.isPending}
                  >
                    <Trash className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="text-muted-foreground mt-3 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{address.line1}</p>
                {address.line2 && <p className="truncate">{address.line2}</p>}
                <p className="truncate">{addressSummary(address)}</p>
              </div>
            </div>

            <p className="text-muted-foreground/70 mt-auto pt-4 text-xs">
              Added {formatDate(address.created_at)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
