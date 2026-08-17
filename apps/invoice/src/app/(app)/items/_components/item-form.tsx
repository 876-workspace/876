'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import { client } from '@/lib/client'
import type { InvoiceItemType } from '@/lib/client/items'

export interface ItemFormValues {
  id: string
  type: InvoiceItemType
  name: string
  sku?: string | null
  unit?: string | null
  description?: string | null
  defaultSellingAmount?: string | null
  defaultSellingCurrency?: string | null
  isTaxable: boolean
  taxCode?: string | null
  isActive: boolean
}

const itemFormRowClassName = 'sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3'

function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits
  } catch {
    return 2
  }
}

function minorToInput(amount: string | null | undefined, currency: string) {
  if (!amount) return ''
  const digits = currencyDigits(currency)
  const factor = 10n ** BigInt(digits)
  const value = BigInt(amount)
  const whole = value / factor
  const fraction = (value % factor).toString().padStart(digits, '0')
  return digits ? `${whole}.${fraction}` : whole.toString()
}

function inputToMinor(value: string, currency: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null

  const digits = currencyDigits(currency)
  const match = normalized.match(/^\d+(?:\.(\d+))?$/)
  if (!match) return null

  const [whole = '0', fraction = ''] = normalized.split('.')
  if (fraction.length > digits) return null
  return `${whole}${fraction.padEnd(digits, '0')}`.replace(/^0+(?=\d)/, '') || '0'
}

export function ItemForm({
  currency,
  item,
}: {
  currency: string
  item?: ItemFormValues
}) {
  const router = useRouter()
  const [type, setType] = useState<InvoiceItemType>(item?.type ?? 'SERVICE')
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [sku, setSku] = useState(item?.sku ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [price, setPrice] = useState(() =>
    minorToInput(
      item?.defaultSellingAmount,
      item?.defaultSellingCurrency ?? currency
    )
  )
  const [isTaxable, setIsTaxable] = useState(item?.isTaxable ?? false)
  const [taxCode, setTaxCode] = useState(item?.taxCode ?? '')
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Item name is required.')
      return
    }

    const minorAmount = inputToMinor(price, currency)
    if (price.trim() && minorAmount === null) {
      setError(`Enter a valid ${currency} amount.`)
      return
    }

    startTransition(async () => {
      const cleared = (next: string, previous: string | null | undefined) =>
        next ? next : previous ? null : undefined

      const descriptionValue = cleared(description.trim(), item?.description)
      const skuValue = cleared(sku.trim(), item?.sku)
      const unitValue = cleared(unit.trim(), item?.unit)
      const taxCodeValue = cleared(taxCode.trim(), item?.taxCode)
      const hadPrice = Boolean(item?.defaultSellingAmount)

      const params = {
        type,
        name: name.trim(),
        ...(descriptionValue === undefined
          ? {}
          : { description: descriptionValue }),
        ...(skuValue === undefined ? {} : { sku: skuValue }),
        ...(unitValue === undefined ? {} : { unit: unitValue }),
        ...(minorAmount !== null
          ? {
              defaultSellingAmount: minorAmount,
              defaultSellingCurrency: currency,
            }
          : hadPrice
            ? {
                defaultSellingAmount: null,
                defaultSellingCurrency: null,
              }
            : {}),
        isTaxable,
        ...(taxCodeValue === undefined ? {} : { taxCode: taxCodeValue }),
      }

      const result = item
        ? await client.items.update(item.id, { ...params, isActive })
        : await client.items.create(params)

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(item ? `/items/${item.id}` : '/items')
      router.refresh()
    })
  }

  return (
    <form className="max-w-3xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        <FormRow
          label="Type"
          required
          className={itemFormRowClassName}
        >
          <Select
            value={type}
            onValueChange={(value) => setType(value as InvoiceItemType)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SERVICE">Service</SelectItem>
              <SelectItem value="GOOD">Good</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow
          htmlFor="item-name"
          label="Name"
          required
          className={itemFormRowClassName}
        >
          <Input
            id="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            required
          />
        </FormRow>

        <FormRow
          htmlFor="item-description"
          label="Description"
          className={itemFormRowClassName}
        >
          <Input
            id="item-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
          />
        </FormRow>

        <FormRow
          htmlFor="item-sku"
          label="SKU"
          className={itemFormRowClassName}
        >
          <Input
            id="item-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            disabled={isPending}
          />
        </FormRow>

        <FormRow
          htmlFor="item-unit"
          label="Unit"
          className={itemFormRowClassName}
          hint="For example: hour, piece, kg."
        >
          <Input
            id="item-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            disabled={isPending}
          />
        </FormRow>

        <FormRow
          htmlFor="item-price"
          label="Default price"
          className={itemFormRowClassName}
          hint={`Stored in ${currency}.`}
        >
          <div className="flex items-center gap-2">
            <Input
              id="item-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={isPending}
              placeholder="0.00"
            />
            <span className="text-muted-foreground text-sm font-medium">
              {currency}
            </span>
          </div>
        </FormRow>

        <FormRow
          htmlFor="item-taxable"
          label="Tax"
          className={itemFormRowClassName}
        >
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input
              id="item-taxable"
              type="checkbox"
              checked={isTaxable}
              onChange={(event) => setIsTaxable(event.target.checked)}
              disabled={isPending}
              className="size-4 rounded border"
            />
            Taxable item
          </label>
        </FormRow>

        {isTaxable ? (
          <FormRow
            htmlFor="item-tax-code"
            label="Tax code"
            className={itemFormRowClassName}
          >
            <Input
              id="item-tax-code"
              value={taxCode}
              onChange={(event) => setTaxCode(event.target.value)}
              disabled={isPending}
            />
          </FormRow>
        ) : null}

        {item ? (
          <FormRow label="Status" className={itemFormRowClassName}>
            <Select
              value={isActive ? 'ACTIVE' : 'ARCHIVED'}
              onValueChange={(value) => setIsActive(value === 'ACTIVE')}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        ) : null}
      </div>

      {error ? <div className="text-destructive text-sm">{error}</div> : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={isPending}>
          {item ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
