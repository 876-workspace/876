import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'

import { formatAddressLine } from '@/lib/address/format'
import type { WarehouseView } from '@/types/warehouse'

type Props = {
  warehouses: WarehouseView[]
  orgSlug: string
  emptyState?: React.ReactNode
}

export function WarehousesCards({ warehouses, orgSlug, emptyState }: Props) {
  if (warehouses.length === 0) return <>{emptyState}</>

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {warehouses.map((warehouse) => (
        <div key={warehouse.id} className="876-card flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium">{warehouse.name}</span>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/org/${orgSlug}/settings/warehouses/${warehouse.id}/edit`}
                />
              }
            >
              Edit
            </Button>
          </div>

          {/* Inactive wins over primary: a retired warehouse that still holds
              the primary flag must not read as the live one. */}
          {!warehouse.isActive || warehouse.isPrimary ? (
            <div className="flex flex-wrap gap-1.5">
              {!warehouse.isActive ? (
                <Badge variant="secondary">Inactive</Badge>
              ) : (
                <Badge>Primary</Badge>
              )}
            </div>
          ) : null}

          <div className="text-muted-foreground space-y-1 text-sm">
            <p>{formatAddressLine(warehouse.address)}</p>
            <p>{warehouse.address.countryCode}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
