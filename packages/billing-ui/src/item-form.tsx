'use client'

import { useState, useTransition, type FormEvent } from 'react'
import type {
  BillingItem,
  BillingItemCreateParams,
  BillingItemUpdateParams,
} from '@876/billing/integration'
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

export type ItemFormValues = Pick<
  BillingItem,
  | 'id'
  | 'type'
  | 'name'
  | 'sku'
  | 'unit'
  | 'description'
  | 'defaultSellingAmount'
  | 'defaultSellingCurrency'
  | 'isTaxable'
  | 'taxCode'
  | 'trackStock'
  | 'stockQuantity'
  | 'lowStockThreshold'
  | 'allowOutOfStock'
  | 'isActive'
>
export type ItemFormParams = Omit<
  BillingItemCreateParams,
  'defaultSellingAmount'
> & {
  defaultSellingAmount?: string | null
  isActive?: boolean
}

function currencyDigits(currency: string) {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}
function minorToInput(amount: string | null | undefined, currency: string) {
  if (!amount) return ''
  const digits = currencyDigits(currency)
  const factor = 10n ** BigInt(digits)
  const value = BigInt(amount)
  return digits
    ? `${value / factor}.${(value % factor).toString().padStart(digits, '0')}`
    : value.toString()
}
function inputToMinor(value: string, currency: string): string | null {
  const text = value.trim()
  if (!text) return null
  const match = text.match(/^(\d+)(?:\.(\d+))?$/)
  const digits = currencyDigits(currency)
  if (!match || (match[2]?.length ?? 0) > digits) return null
  return (
    `${match[1]}${(match[2] ?? '').padEnd(digits, '0')}`.replace(
      /^0+(?=\d)/,
      ''
    ) || '0'
  )
}

export function ItemForm({
  currency,
  item,
  onSubmit,
  onCancel,
}: {
  currency: string
  item?: ItemFormValues
  onSubmit: (
    params: ItemFormParams
  ) => Promise<{ error: { message: string } | null }>
  onCancel: () => void
}) {
  const [type, setType] = useState(item?.type ?? 'SERVICE')
  const [name, setName] = useState(item?.name ?? '')
  const [sku, setSku] = useState(item?.sku ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(
    minorToInput(
      item?.defaultSellingAmount,
      item?.defaultSellingCurrency ?? currency
    )
  )
  const [isTaxable, setTaxable] = useState(item?.isTaxable ?? false)
  const [taxCode, setTaxCode] = useState(item?.taxCode ?? '')
  const [trackStock, setTrackStock] = useState(item?.trackStock ?? false)
  const [stockQuantity, setStockQuantity] = useState(
    String(item?.stockQuantity ?? 0)
  )
  const [lowStockThreshold, setLowStockThreshold] = useState(
    item?.lowStockThreshold === null || item?.lowStockThreshold === undefined
      ? ''
      : String(item.lowStockThreshold)
  )
  const [allowOutOfStock, setAllowOutOfStock] = useState(
    item?.allowOutOfStock ?? false
  )
  const [isActive, setActive] = useState(item?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const row = 'sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3'
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const amount = inputToMinor(price, currency)
    const quantity = Number(stockQuantity)
    const threshold = lowStockThreshold.trim()
      ? Number(lowStockThreshold)
      : null
    if (!name.trim()) return setError('Item name is required.')
    if (price.trim() && amount === null)
      return setError(`Enter a valid ${currency} amount.`)
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      !Number.isSafeInteger(threshold ?? 0) ||
      (threshold ?? 0) < 0
    )
      return setError('Stock values must be whole numbers of zero or more.')
    const params = {
      type,
      name: name.trim(),
      sku: sku.trim() || null,
      unit: unit.trim() || null,
      description: description.trim() || null,
      ...(amount === null
        ? {}
        : { defaultSellingAmount: amount, defaultSellingCurrency: currency }),
      isTaxable,
      taxCode: taxCode.trim() || null,
      trackStock: type === 'GOOD' && trackStock,
      lowStockThreshold: type === 'GOOD' && trackStock ? threshold : null,
      allowOutOfStock: type === 'GOOD' && trackStock && allowOutOfStock,
      ...(!item && type === 'GOOD' && trackStock
        ? { stockQuantity: quantity }
        : {}),
      ...(item ? { isActive } : {}),
    }
    startTransition(async () => {
      const result = await onSubmit(params)
      if (result.error) setError(result.error.message)
    })
  }
  return (
    <form className="max-w-3xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        <FormRow label="Type" required className={row}>
          <Select
            value={type}
            onValueChange={(value) => setType(value as typeof type)}
            disabled={pending}
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
        <FormRow htmlFor="item-name" label="Name" required className={row}>
          <Input
            id="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
            required
          />
        </FormRow>
        <FormRow htmlFor="item-description" label="Description" className={row}>
          <Input
            id="item-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="item-sku" label="SKU" className={row}>
          <Input
            id="item-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="item-unit" label="Unit" className={row}>
          <Input
            id="item-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        {type === 'GOOD' ? (
          <>
            <FormRow label="Stock" className={row}>
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(event) => setTrackStock(event.target.checked)}
                  disabled={pending}
                />
                Track stock for this good
              </label>
            </FormRow>
            {trackStock ? (
              <>
                <FormRow
                  htmlFor="item-stock"
                  label="Opening stock"
                  className={row}
                >
                  <Input
                    id="item-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={stockQuantity}
                    onChange={(event) => setStockQuantity(event.target.value)}
                    disabled={pending || Boolean(item)}
                  />
                </FormRow>
                <FormRow
                  htmlFor="item-low-stock"
                  label="Low stock warning"
                  className={row}
                >
                  <Input
                    id="item-low-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={lowStockThreshold}
                    onChange={(event) =>
                      setLowStockThreshold(event.target.value)
                    }
                    disabled={pending}
                  />
                </FormRow>
                <FormRow label="Out of stock" className={row}>
                  <label className="flex min-h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allowOutOfStock}
                      onChange={(event) =>
                        setAllowOutOfStock(event.target.checked)
                      }
                      disabled={pending}
                    />
                    Allow sales below zero
                  </label>
                </FormRow>
              </>
            ) : null}
          </>
        ) : null}
        <FormRow htmlFor="item-price" label="Default price" className={row}>
          <div className="flex items-center gap-2">
            <Input
              id="item-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={pending}
              placeholder="0.00"
            />
            <span className="text-muted-foreground text-sm font-medium">
              {currency}
            </span>
          </div>
        </FormRow>
        <FormRow label="Tax" className={row}>
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isTaxable}
              onChange={(event) => setTaxable(event.target.checked)}
              disabled={pending}
            />
            Taxable item
          </label>
        </FormRow>
        {isTaxable ? (
          <FormRow htmlFor="item-tax-code" label="Tax code" className={row}>
            <Input
              id="item-tax-code"
              value={taxCode}
              onChange={(event) => setTaxCode(event.target.value)}
              disabled={pending}
            />
          </FormRow>
        ) : null}
        {item ? (
          <FormRow label="Status" className={row}>
            <Select
              value={isActive ? 'ACTIVE' : 'ARCHIVED'}
              onValueChange={(value) => setActive(value === 'ACTIVE')}
              disabled={pending}
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
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={pending}>
          {item ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
