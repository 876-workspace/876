'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow, FormRowGroup } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import {
  AddressFields,
  emptyAddressValue,
  toAddressFieldsValue,
  toAddressParams,
  type AddressFieldsValue,
} from '@/components/patterns/address-fields'
import { client } from '@/lib/client'
import type { WarehouseView } from '@/types/warehouse'

import { ShippingAddressPreview } from './shipping-address-preview'

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
    warehouse?.operatingModel ?? 'AGENT'
  )
  const [agentName, setAgentName] = useState(warehouse?.agentName ?? '')
  const [code, setCode] = useState(warehouse?.code ?? '')
  const [mailboxPlacement, setMailboxPlacement] = useState(
    warehouse?.mailboxPlacement ?? 'ADDRESS_LINE_2'
  )
  const [mailboxPrefix, setMailboxPrefix] = useState(
    warehouse?.mailboxPrefix ?? ''
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

  const listHref = `/${orgSlug}/settings/warehouses`
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
      <div className="876-card space-y-5 p-5">
        <FormRow htmlFor="warehouse-name" label="Warehouse name" required>
          <Input
            id="warehouse-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            required
          />
        </FormRow>

        <FormRow
          label="Operating model"
          hint="Whether your own staff receive packages here, or a third-party agent receives them on your behalf."
        >
          <RadioGroup
            value={operatingModel}
            onValueChange={(value) =>
              setOperatingModel(value as typeof operatingModel)
            }
            disabled={isPending}
            className="grid-flow-col justify-start gap-6 pt-2"
          >
            {OPERATING_MODEL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </FormRow>

        <FormRow
          label={operatingModel === 'AGENT' ? 'Agent & code' : 'Warehouse code'}
          hint="The code is printed before each customer's mailbox number."
        >
          <FormRowGroup>
            {operatingModel === 'AGENT' ? (
              <Input
                aria-label="Agent name"
                placeholder="Agent name"
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                disabled={isPending}
                maxLength={120}
                className="w-56"
              />
            ) : null}
            <Input
              id="warehouse-code"
              aria-label="Warehouse code"
              placeholder="Code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              disabled={isPending}
              maxLength={16}
              className="w-32"
            />
          </FormRowGroup>
        </FormRow>

        {isFirstWarehouse ? (
          <FormRow label="Primary">
            <p className="text-muted-foreground pt-2 text-sm">
              Your first warehouse is the primary warehouse.
            </p>
          </FormRow>
        ) : warehouse?.isPrimary ? (
          <FormRow label="Primary">
            <p className="text-muted-foreground pt-2 text-sm">
              This is the primary warehouse. Promote another warehouse to change
              it.
            </p>
          </FormRow>
        ) : (
          <FormRow label="Primary">
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="warehouse-primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
                disabled={isPending}
              />
              <Label htmlFor="warehouse-primary" className="mb-0">
                Set as primary warehouse
              </Label>
            </div>
          </FormRow>
        )}
      </div>

      <Tabs defaultValue="address" className="gap-5">
        <TabsList variant="line" className="mb-1">
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="customer-address">Mailbox config</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom fields</TabsTrigger>
        </TabsList>

        <TabsContent value="address" className="876-card p-5">
          <AddressFields
            value={address}
            onChange={setAddress}
            disabled={isPending}
            onGeographyUnavailable={setGeographyUnavailable}
          />
        </TabsContent>

        <TabsContent
          value="customer-address"
          className="876-card space-y-5 p-5"
        >
          <FormRow
            htmlFor="warehouse-mailbox-placement"
            label="Mailbox placement"
            hint="Where a customer's mailbox number goes in the address they give a retailer."
          >
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
                className="w-full"
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
          </FormRow>

          <FormRow
            htmlFor="warehouse-mailbox-prefix"
            label="Prefix"
            hint='Your label for the mailbox, printed before the number — a prefix of "Suite" gives "Suite 1042".'
          >
            <Input
              id="warehouse-mailbox-prefix"
              value={mailboxPrefix}
              onChange={(event) =>
                setMailboxPrefix(
                  event.target.value.replace(/[^A-Za-z]/g, '').toUpperCase()
                )
              }
              disabled={isPending}
              maxLength={16}
              className="w-40"
            />
          </FormRow>

          <FormRow label="Preview">
            <ShippingAddressPreview
              warehouse={{
                code: code.trim() === '' ? null : code.trim(),
                mailboxPrefix: mailboxPrefix === '' ? null : mailboxPrefix,
                mailboxPlacement,
                address,
              }}
            />
          </FormRow>
        </TabsContent>

        {/* TODO: custom fields are not built yet. The tab is deliberately
            empty rather than absent so the information architecture is
            visible; `instructions` is intentionally not submitted from here,
            so an existing warehouse's value is left untouched on save. */}
        <TabsContent value="custom-fields" className="876-card p-5">
          <p className="text-muted-foreground text-sm">No custom fields yet.</p>
        </TabsContent>
      </Tabs>

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
