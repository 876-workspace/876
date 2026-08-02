'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Textarea } from '@876/ui/textarea'

import {
  AddressFields,
  emptyAddressValue,
  toAddressFieldsValue,
  toAddressParams,
  type AddressFieldsValue,
} from '@/components/address-fields'
import { client } from '@/lib/client'
import type { WarehouseView } from '@/types/warehouse'

const OPERATING_MODEL_OPTIONS = [
  { value: 'OWNED', label: 'We operate this warehouse' },
  { value: 'AGENT', label: 'A receiving agent operates it' },
] as const

const MAILBOX_PLACEMENT_OPTIONS = [
  { value: 'RECIPIENT_LINE', label: 'On the recipient line' },
  { value: 'ADDRESS_LINE_1', label: 'On the street line' },
  { value: 'ADDRESS_LINE_2', label: 'On its own line' },
] as const

type Props = {
  orgSlug: string
  warehouse?: WarehouseView
  /** Whether this would be the tenant's first warehouse, which is always primary. */
  isFirstWarehouse?: boolean
}

export function WarehouseForm({ orgSlug, warehouse, isFirstWarehouse }: Props) {
  const router = useRouter()
  const [name, setName] = useState(warehouse?.name ?? '')
  const [operatingModel, setOperatingModel] = useState(
    warehouse?.operatingModel ?? 'OWNED'
  )
  const [agentName, setAgentName] = useState(warehouse?.agentName ?? '')
  const [code, setCode] = useState(warehouse?.code ?? '')
  const [mailboxPlacement, setMailboxPlacement] = useState(
    warehouse?.mailboxPlacement ?? 'ADDRESS_LINE_2'
  )
  const [mailboxPrefix, setMailboxPrefix] = useState(
    warehouse?.mailboxPrefix ?? ''
  )
  const [instructions, setInstructions] = useState(
    warehouse?.instructions ?? ''
  )
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

  const listHref = `/org/${orgSlug}/settings/warehouses`
  const lockedPrimary =
    warehouse?.isPrimary === true || isFirstWarehouse === true

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const addressParams = toAddressParams(address, name.trim())
      const receivingParams = {
        operatingModel,
        ...(operatingModel === 'AGENT' ? { agentName: agentName.trim() } : {}),
        code: code.trim(),
        mailboxPlacement,
        mailboxPrefix: mailboxPrefix.trim(),
        instructions: instructions.trim(),
      }
      const result = warehouse
        ? await client.warehouses.update(orgSlug, warehouse.id, {
            name: name.trim(),
            ...(lockedPrimary ? {} : { isPrimary }),
            ...receivingParams,
            address: addressParams,
          })
        : await client.warehouses.create(orgSlug, {
            name: name.trim(),
            ...(lockedPrimary ? {} : { isPrimary }),
            ...receivingParams,
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

      <div className="876-card space-y-4 p-5">
        <h2 className="font-medium">Receiving</h2>
        <div>
          <Label htmlFor="warehouse-operating-model">Operating model</Label>
          <Select
            value={operatingModel}
            onValueChange={(value) => setOperatingModel(value as typeof operatingModel)}
            disabled={isPending}
            items={OPERATING_MODEL_OPTIONS}
          >
            <SelectTrigger id="warehouse-operating-model" className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATING_MODEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {operatingModel === 'AGENT' ? (
          <div>
            <Label htmlFor="warehouse-agent-name">Agent name</Label>
            <Input
              id="warehouse-agent-name"
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
              disabled={isPending}
              maxLength={120}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="warehouse-code">Warehouse code</Label>
          <Input
            id="warehouse-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            disabled={isPending}
            maxLength={16}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Printed before each customer&apos;s mailbox number.
          </p>
        </div>
      </div>

      <div className="876-card p-5">
        <AddressFields
          value={address}
          onChange={setAddress}
          disabled={isPending}
          onGeographyUnavailable={setGeographyUnavailable}
        />
      </div>

      <div className="876-card space-y-4 p-5">
        <h2 className="font-medium">Customer address</h2>
        <div>
          <Label htmlFor="warehouse-mailbox-placement">
            Mailbox number placement
          </Label>
          <Select
            value={mailboxPlacement}
            onValueChange={(value) =>
              setMailboxPlacement(value as typeof mailboxPlacement)
            }
            disabled={isPending}
            items={MAILBOX_PLACEMENT_OPTIONS}
          >
            <SelectTrigger
              id="warehouse-mailbox-placement"
              className="mt-1 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAILBOX_PLACEMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="warehouse-mailbox-prefix">Prefix</Label>
          <Input
            id="warehouse-mailbox-prefix"
            value={mailboxPrefix}
            onChange={(event) => setMailboxPrefix(event.target.value)}
            disabled={isPending}
            maxLength={16}
          />
        </div>

        <div>
          <Label htmlFor="warehouse-instructions">Instructions</Label>
          <Textarea
            id="warehouse-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            disabled={isPending}
            maxLength={500}
          />
        </div>
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
