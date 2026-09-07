'use client'

import { useState, useTransition } from 'react'

import type {
  TaxAuthority,
  TaxRate,
  TaxRateCreateParams,
  TaxRateUpdateParams,
} from '@876/billing'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Calendar, Hash, Plus } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

type MutationResult = { error: { message: string } | null }
export interface TaxRateSettingsPanelProps {
  authorities: TaxAuthority[]
  rates: TaxRate[]
  canManage: boolean
  currentTimestamp: number
  onCreate: (params: TaxRateCreateParams) => Promise<MutationResult>
  onUpdate: (id: string, params: TaxRateUpdateParams) => Promise<MutationResult>
  onSuccess: () => void
}

/** Presentation-only immutable tax-rate settings surface shared by Billing and Invoice. */
export function TaxRateSettingsPanel({
  authorities,
  rates,
  canManage,
  currentTimestamp,
  onCreate,
  onUpdate,
  onSuccess,
}: TaxRateSettingsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const defaultAuthority = authorities.find(
    (authority) => authority.isDefault && authority.isActive
  )
  function run(action: () => Promise<MutationResult>, done?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error.message)
        return
      }
      done?.()
      onSuccess()
    })
  }
  return (
    <section className="space-y-4" aria-label="Tax rates">
      <div className="flex items-center justify-between gap-3">
        <h2 className="876-page-title">Tax rates</h2>
        {canManage ? (
          <Button
            variant="info"
            disabled={
              isPending || authorities.every((authority) => !authority.isActive)
            }
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        ) : null}
      </div>
      {showForm ? (
        <RateForm
          authorities={authorities.filter((authority) => authority.isActive)}
          defaultAuthorityId={defaultAuthority?.id ?? ''}
          disabled={isPending}
          onCancel={() => setShowForm(false)}
          onSubmit={(params) =>
            run(
              () => onCreate(params),
              () => setShowForm(false)
            )
          }
        />
      ) : null}
      {error ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}
      <div className="876-card overflow-hidden">
        {rates.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Hash className="text-muted-foreground mx-auto size-6" />
            <p className="mt-3 text-sm font-medium">No tax rates</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[1.3fr_.65fr_1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{rate.name}</p>
                    {rate.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    <RateStatus
                      rate={rate}
                      currentTimestamp={currentTimestamp}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {rate.taxAuthority.name}
                    {rate.taxType ? ` · ${rate.taxType.toUpperCase()}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {rate.rate}%
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {rate.inclusive ? 'Included in price' : 'Added to price'}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="text-muted-foreground size-4" />
                    {rate.startsAt
                      ? formatDate(rate.startsAt)
                      : 'Effective immediately'}
                  </p>
                </div>
                {canManage && !rate.isDefault ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending || !rate.isActive}
                      onClick={() =>
                        run(() => onUpdate(rate.id, { isDefault: true }))
                      }
                    >
                      Make default
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        run(() =>
                          onUpdate(rate.id, { isActive: !rate.isActive })
                        )
                      }
                    >
                      {rate.isActive ? 'Archive' : 'Restore'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
function RateForm({
  authorities,
  defaultAuthorityId,
  disabled,
  onCancel,
  onSubmit,
}: {
  authorities: TaxAuthority[]
  defaultAuthorityId: string
  disabled: boolean
  onCancel: () => void
  onSubmit: (params: TaxRateCreateParams) => void
}) {
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [taxType, setTaxType] = useState('gct')
  const [authorityId, setAuthorityId] = useState(
    defaultAuthorityId || authorities[0]?.id || ''
  )
  const [inclusive, setInclusive] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [description, setDescription] = useState('')
  return (
    <form
      className="876-card border-876-blue/25 grid gap-4 p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          name,
          rate,
          taxType: taxType.trim() || undefined,
          taxAuthorityId: authorityId,
          inclusive,
          startsAt: startDate
            ? Math.floor(Date.parse(`${startDate}T00:00:00Z`) / 1000)
            : undefined,
          description: description.trim() || undefined,
        })
      }}
    >
      <p className="font-semibold sm:col-span-2">New tax rate</p>
      <Field label="Tax name" htmlFor="tax-rate-name">
        <Input
          id="tax-rate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>
      <Field label="Rate (%)" htmlFor="tax-rate-percentage">
        <Input
          id="tax-rate-percentage"
          type="number"
          min="0"
          max="100"
          step="0.0001"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          required
        />
      </Field>
      <Field label="Tax type" htmlFor="tax-rate-type" optional>
        <Input
          id="tax-rate-type"
          value={taxType}
          onChange={(event) => setTaxType(event.target.value.toLowerCase())}
        />
      </Field>
      <Field label="Tax authority" htmlFor="tax-rate-authority">
        <NativeSelect
          id="tax-rate-authority"
          value={authorityId}
          onChange={(event) => setAuthorityId(event.target.value)}
          required
        >
          {authorities.map((authority) => (
            <NativeSelectOption key={authority.id} value={authority.id}>
              {authority.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Effective from" htmlFor="tax-rate-start" optional>
        <Input
          id="tax-rate-start"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </Field>
      <Field
        label="Internal description"
        htmlFor="tax-rate-description"
        optional
      >
        <Textarea
          id="tax-rate-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
      </Field>
      <label className="border-border bg-muted/20 flex cursor-pointer items-start gap-3 rounded-xl border p-4 sm:col-span-2">
        <input
          type="checkbox"
          checked={inclusive}
          onChange={(event) => setInclusive(event.target.checked)}
          className="border-input text-primary mt-0.5 size-4 rounded"
        />
        <span>
          <span className="block text-sm font-medium">
            Prices include this tax
          </span>
          <span className="text-muted-foreground mt-0.5 block text-xs">
            Leave off when tax should be added on top of the listed price.
          </span>
        </span>
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Saving…' : 'Create tax rate'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string
  htmlFor: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="text-muted-foreground ml-1 font-normal">
            (optional)
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  )
}
function RateStatus({
  rate,
  currentTimestamp,
}: {
  rate: TaxRate
  currentTimestamp: number
}) {
  if (!rate.isActive) return <Badge variant="outline">Archived</Badge>
  if (rate.startsAt && rate.startsAt > currentTimestamp)
    return <Badge variant="secondary">Scheduled</Badge>
  return <Badge variant="secondary">Active</Badge>
}
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-JM', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(timestamp * 1000))
}
