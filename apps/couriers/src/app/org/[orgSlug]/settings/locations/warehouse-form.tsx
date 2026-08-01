'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import {
  AddressFields,
  emptyAddressValue,
  toAddressFieldsValue,
  toAddressParams,
  type AddressFieldsValue,
} from '@/components/address-fields'
import { client } from '@/lib/client'
import type { WarehouseView } from '@/types/warehouse'

type Props = {
  orgSlug: string
  warehouse?: WarehouseView
  /** Whether this would be the tenant's first warehouse, which is always primary. */
  isFirstWarehouse?: boolean
}

export function WarehouseForm({ orgSlug, warehouse, isFirstWarehouse }: Props) {
  const router = useRouter()
  const [name, setName] = useState(warehouse?.name ?? '')
  const [isPrimary, setIsPrimary] = useState(warehouse?.isPrimary ?? false)
  const [address, setAddress] = useState<AddressFieldsValue>(
    // A warehouse is the overseas address customers ship purchases to, and in
    // practice that is almost always the US — defaulting to the tenant's own
    // country makes every warehouse start on the wrong region catalog.
    warehouse
      ? toAddressFieldsValue(warehouse.address)
      : emptyAddressValue('US')
  )
  const [geographyUnavailable, setGeographyUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const listHref = `/org/${orgSlug}/settings/locations/warehouses`
  const lockedPrimary =
    warehouse?.isPrimary === true || isFirstWarehouse === true

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const addressParams = toAddressParams(address, name.trim())
      const result = warehouse
        ? await client.warehouses.update(orgSlug, warehouse.id, {
            name: name.trim(),
            ...(lockedPrimary ? {} : { isPrimary }),
            address: addressParams,
          })
        : await client.warehouses.create(orgSlug, {
            name: name.trim(),
            ...(lockedPrimary ? {} : { isPrimary }),
            address: addressParams,
          })

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(listHref)
      router.refresh()
    })
  }

  return (
    <form className="max-w-3xl space-y-6" onSubmit={save}>
      <div className="876-card p-5">
        <Label htmlFor="warehouse-name">Warehouse name</Label>
        <Input
          id="warehouse-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="876-card p-5">
        <AddressFields
          value={address}
          onChange={setAddress}
          disabled={isPending}
          onGeographyUnavailable={setGeographyUnavailable}
        />
      </div>

      <div className="876-card p-5">
        {isFirstWarehouse ? (
          <p className="text-muted-foreground text-sm">
            Your first warehouse is the primary warehouse.
          </p>
        ) : warehouse?.isPrimary ? (
          <p className="text-muted-foreground text-sm">
            This is the primary warehouse. Promote another warehouse to change
            it.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Checkbox
              id="warehouse-primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
              disabled={isPending}
            />
            <Label htmlFor="warehouse-primary">Set as primary warehouse</Label>
          </div>
        )}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="info"
          disabled={isPending || geographyUnavailable}
        >
          {warehouse ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(listHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
