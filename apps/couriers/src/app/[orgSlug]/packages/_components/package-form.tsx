'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Package } from '@876/couriers/admin'
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
import { Textarea } from '@876/ui/textarea'

import type { PackageFormOption } from '../_lib/package-form-data'

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

const STATUS_OPTIONS = [
  ['PRE_ALERT', 'Pre-alert'],
  ['RECEIVED', 'Received'],
  ['IN_TRANSIT', 'In transit'],
  ['ARRIVED', 'Arrived'],
  ['READY_FOR_PICKUP', 'Ready for pickup'],
  ['COLLECTED', 'Collected'],
  ['UNCLAIMED', 'Unclaimed'],
] as const

const TYPE_OPTIONS = [
  ['CARTON', 'Carton'],
  ['ENVELOPE', 'Envelope'],
  ['BAG', 'Bag'],
  ['PALLET', 'Pallet'],
  ['OTHER', 'Other'],
] as const

type Props = {
  orgSlug: string
  customers: PackageFormOption[]
  branches: PackageFormOption[]
  categories: PackageFormOption[]
  pkg?: Package
}

export function PackageForm({
  orgSlug,
  customers,
  branches,
  categories,
  pkg,
}: Props) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState(pkg?.customer_id ?? '')
  const [branchId, setBranchId] = useState(pkg?.branch_id ?? '')
  const [categoryId, setCategoryId] = useState(pkg?.category_id ?? '')
  const [trackingNumber, setTrackingNumber] = useState(pkg?.tracking_num ?? '')
  const [status, setStatus] = useState(pkg?.status ?? 'PRE_ALERT')
  const [packageType, setPackageType] = useState(pkg?.package_type ?? 'CARTON')
  const [description, setDescription] = useState(pkg?.description ?? '')
  const [quantity, setQuantity] = useState(String(pkg?.quantity ?? 1))
  const [actualWeight, setActualWeight] = useState(
    pkg?.actual_weight === null || pkg?.actual_weight === undefined
      ? ''
      : String(pkg.actual_weight)
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!pkg && !customerId) {
      setError('Select a customer.')
      return
    }

    const parsedQuantity = Number(quantity)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError('Quantity must be a whole number of at least 1.')
      return
    }

    const parsedWeight = actualWeight.trim() ? Number(actualWeight) : null
    if (
      parsedWeight !== null &&
      (!Number.isFinite(parsedWeight) || parsedWeight <= 0)
    ) {
      setError('Actual weight must be greater than zero.')
      return
    }

    startTransition(async () => {
      const payload = {
        orgSlug,
        ...(pkg ? {} : { customer_id: customerId }),
        branch_id: branchId || null,
        category_id: categoryId || null,
        tracking_num: trackingNumber.trim() || null,
        status,
        package_type: packageType,
        description: description.trim() || null,
        quantity: parsedQuantity,
        actual_weight: parsedWeight,
      }
      const response = await fetch(
        pkg
          ? `/api/manage/packages/${encodeURIComponent(pkg.id)}`
          : '/api/manage/packages',
        {
          method: pkg ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const result = (await response.json()) as {
        data: Package | null
        error: { message: string } | null
      }

      if (!response.ok || !result.data) {
        setError(result.error?.message ?? 'The package could not be saved.')
        return
      }

      router.push(`/${orgSlug}/packages/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormRow label="Customer" required={!pkg} className={rowClassName}>
        <Select
          value={customerId || undefined}
          onValueChange={(value) => setCustomerId(value ?? '')}
          disabled={Boolean(pkg) || pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Tracking #" className={rowClassName}>
        <Input
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="Carrier tracking number"
          disabled={pending}
        />
      </FormRow>

      <FormRow label="Category" className={rowClassName}>
        <Select
          value={categoryId || 'none'}
          onValueChange={(value) =>
            setCategoryId(!value || value === 'none' ? '' : value)
          }
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Uncategorized</SelectItem>
            {categories.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Branch" className={rowClassName}>
        <Select
          value={branchId || 'none'}
          onValueChange={(value) =>
            setBranchId(!value || value === 'none' ? '' : value)
          }
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No branch</SelectItem>
            {branches.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Status" required className={rowClassName}>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as typeof status)}
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Package type" required className={rowClassName}>
        <Select
          value={packageType}
          onValueChange={(value) => setPackageType(value as typeof packageType)}
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Quantity" required className={rowClassName}>
        <Input
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={pending}
        />
      </FormRow>

      <FormRow label="Actual weight" className={rowClassName}>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={actualWeight}
            onChange={(event) => setActualWeight(event.target.value)}
            disabled={pending}
          />
          <span className="text-muted-foreground text-sm">lb</span>
        </div>
      </FormRow>

      <FormRow label="Description" className={rowClassName}>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          disabled={pending}
        />
      </FormRow>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending || (!pkg && customers.length === 0)}
        >
          {pending ? 'Saving…' : pkg ? 'Save changes' : 'Add package'}
        </Button>
      </div>
    </form>
  )
}
