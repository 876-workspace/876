import type { AdminAddress } from '@876/admin'

import { addressPreviewSummary, formatAddressType } from './address-utils'

type Props = {
  addresses: AdminAddress[]
}

export function AddressOverviewList({ addresses }: Props) {
  return (
    <ul className="space-y-2.5">
      {addresses.map((address) => (
        <li
          key={address.id}
          className="border-876-surface-border bg-background/60 min-w-0 rounded-lg border px-3.5 py-3"
        >
          <span className="block truncate text-sm font-medium capitalize">
            {address.label || formatAddressType(address.type)}
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            {addressPreviewSummary(address)}
          </span>
        </li>
      ))}
    </ul>
  )
}
