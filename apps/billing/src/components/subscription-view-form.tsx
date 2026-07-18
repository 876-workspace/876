'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

const fields = [
  ['status', 'Status'],
  ['customerId', 'Customer ID'],
  ['customerName', 'Customer name'],
  ['currency', 'Currency'],
  ['collectionMethod', 'Payment mode'],
  ['billingTiming', 'Billing timing'],
  ['taxBehavior', 'Tax display'],
  ['createdAt', 'Created date'],
  ['currentPeriodEnd', 'Period end'],
] as const
const operators = [
  ['EQUALS', 'Equals'],
  ['NOT_EQUALS', 'Does not equal'],
  ['CONTAINS', 'Contains'],
  ['IN', 'Is one of'],
  ['BEFORE', 'Before timestamp'],
  ['AFTER', 'After timestamp'],
  ['IS_EMPTY', 'Is empty'],
  ['IS_NOT_EMPTY', 'Is not empty'],
] as const
type Rule = {
  field: (typeof fields)[number][0]
  operator: (typeof operators)[number][0]
  value: string
}

type ViewInitial = {
  name: string
  visibility: 'PRIVATE' | 'TENANT'
  isFavorite: boolean
  sortField: 'createdAt' | 'currentPeriodEnd' | 'status' | null
  sortDirection: 'asc' | 'desc' | null
  rules: Rule[]
  columns: string[]
}

export function SubscriptionViewForm({
  viewId,
  initial,
}: {
  viewId?: string
  initial?: ViewInitial
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rules, setRules] = useState<Rule[]>(() =>
    initial?.rules.length
      ? initial.rules.map((rule) => ({
          ...rule,
          value: displayRuleValue(rule),
        }))
      : [{ field: 'status', operator: 'EQUALS', value: 'ACTIVE' }]
  )
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="876-card mx-auto max-w-4xl space-y-6 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const columns = [
          'customer',
          'offering',
          'amount',
          'status',
          'billingDate',
          'createdAt',
        ].filter((column) => data.get(`column-${column}`) === 'on') as Array<
          | 'customer'
          | 'offering'
          | 'amount'
          | 'status'
          | 'billingDate'
          | 'createdAt'
        >
        startTransition(async () => {
          const payload = {
            name: String(data.get('name') ?? ''),
            visibility: String(data.get('visibility')) as 'PRIVATE' | 'TENANT',
            isFavorite: data.get('isFavorite') === 'on',
            sortField: String(data.get('sortField')) as
              | 'createdAt'
              | 'currentPeriodEnd'
              | 'status',
            sortDirection: String(data.get('sortDirection')) as 'asc' | 'desc',
            rules: rules.map((rule) => ({
              ...rule,
              value: serializeRuleValue(rule),
            })),
            columns,
          }
          const result = viewId
            ? await client.subscriptions.updateView(viewId, payload)
            : await client.subscriptions.createView(payload)
          if (result.error) {
            setMessage(result.error.message)
            return
          }
          router.push('/subscriptions')
          router.refresh()
        })
      }}
    >
      <div>
        <h1 className="876-page-title">
          {viewId ? 'Edit subscription view' : 'New subscription view'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Save reusable server-side filters and choose the columns your team
          needs. Date rules use your selected UTC calendar date.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="view-name">Name</Label>
          <Input
            id="view-name"
            name="name"
            defaultValue={initial?.name}
            required
          />
        </div>
        <Select
          name="visibility"
          label="Visibility"
          options={[
            ['PRIVATE', 'Only me'],
            ['TENANT', 'Everyone in this workspace'],
          ]}
          initial={initial?.visibility}
        />
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Rules</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRules((current) => [
                ...current,
                { field: 'status', operator: 'EQUALS', value: '' },
              ])
            }
          >
            Add rule
          </Button>
        </div>
        {rules.map((rule, index) => (
          <div
            key={index}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <NativeSelect
              value={rule.field}
              onChange={(event) =>
                setRules((current) =>
                  current.map((entry, position) =>
                    position === index
                      ? {
                          ...entry,
                          field: event.target.value as Rule['field'],
                          operator: 'EQUALS',
                          value: '',
                        }
                      : entry
                  )
                )
              }
            >
              {fields.map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={rule.operator}
              onChange={(event) =>
                setRules((current) =>
                  current.map((entry, position) =>
                    position === index
                      ? {
                          ...entry,
                          operator: event.target.value as Rule['operator'],
                        }
                      : entry
                  )
                )
              }
            >
              {operatorsFor(rule.field).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              type={isDateRule(rule) ? 'date' : 'text'}
              value={rule.value}
              onChange={(event) =>
                setRules((current) =>
                  current.map((entry, position) =>
                    position === index
                      ? { ...entry, value: event.target.value }
                      : entry
                  )
                )
              }
              placeholder={
                isDateRule(rule) ? undefined : 'Value or comma-separated values'
              }
              disabled={
                rule.operator === 'IS_EMPTY' || rule.operator === 'IS_NOT_EMPTY'
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRules((current) =>
                  current.filter((_, position) => position !== index)
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Columns</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['customer', 'Customer'],
            ['offering', 'Product and plan'],
            ['amount', 'Recurring amount'],
            ['status', 'Status'],
            ['billingDate', 'Renewal date'],
            ['createdAt', 'Created date'],
          ].map(([value, label]) => (
            <label
              key={value}
              className="border-border flex items-center gap-3 rounded-lg border p-3 text-sm"
            >
              <input
                name={`column-${value}`}
                type="checkbox"
                defaultChecked={
                  initial
                    ? initial.columns.includes(value)
                    : value !== 'createdAt'
                }
                className="size-4"
              />
              {label}
            </label>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          name="sortField"
          label="Sort field"
          options={[
            ['createdAt', 'Created date'],
            ['currentPeriodEnd', 'Period end'],
            ['status', 'Status'],
          ]}
          initial={initial?.sortField ?? undefined}
        />
        <Select
          name="sortDirection"
          label="Direction"
          options={[
            ['desc', 'Descending'],
            ['asc', 'Ascending'],
          ]}
          initial={initial?.sortDirection ?? undefined}
        />
        <label className="flex items-center gap-3 self-end pb-3 text-sm">
          <input
            name="isFavorite"
            type="checkbox"
            defaultChecked={initial?.isFavorite}
            className="size-4"
          />{' '}
          Favorite view
        </label>
      </div>
      {message ? (
        <p role="status" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {viewId ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (!window.confirm('Delete this saved view?')) return
              startTransition(async () => {
                const result = await client.subscriptions.deleteView(viewId)
                if (result.error) {
                  setMessage(result.error.message)
                  return
                }
                router.push('/subscriptions')
                router.refresh()
              })
            }}
          >
            Delete view
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : viewId ? 'Update view' : 'Save view'}
        </Button>
      </div>
    </form>
  )
}

function Select({
  name,
  label,
  options,
  initial,
}: {
  name: string
  label: string
  options: Array<[string, string]>
  initial?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect
        id={name}
        name={name}
        defaultValue={initial}
        className="w-full"
      >
        {options.map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

function operatorsFor(field: Rule['field']) {
  if (field === 'createdAt')
    return operators.filter(([operator]) =>
      ['EQUALS', 'BEFORE', 'AFTER'].includes(operator)
    )
  if (field === 'currentPeriodEnd')
    return operators.filter(([operator]) =>
      ['EQUALS', 'BEFORE', 'AFTER', 'IS_EMPTY', 'IS_NOT_EMPTY'].includes(
        operator
      )
    )
  if (
    field === 'customerName' ||
    field === 'customerId' ||
    field === 'currency'
  )
    return operators.filter(([operator]) =>
      ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'IN'].includes(operator)
    )

  return operators.filter(([operator]) =>
    ['EQUALS', 'NOT_EQUALS', 'IN'].includes(operator)
  )
}

function isDateRule(rule: Rule) {
  return (
    (rule.field === 'createdAt' || rule.field === 'currentPeriodEnd') &&
    !['IS_EMPTY', 'IS_NOT_EMPTY'].includes(rule.operator)
  )
}

function serializeRuleValue(rule: Rule): string | null {
  if (rule.operator === 'IS_EMPTY' || rule.operator === 'IS_NOT_EMPTY')
    return null
  if (!rule.value) return null
  if (!isDateRule(rule)) return rule.value

  const timestamp = Date.parse(`${rule.value}T00:00:00.000Z`)

  return Number.isNaN(timestamp) ? rule.value : String(timestamp / 1000)
}

function displayRuleValue(rule: Rule): string {
  if (!isDateRule(rule) || !/^\d+$/.test(rule.value)) return rule.value

  return new Date(Number(rule.value) * 1000).toISOString().slice(0, 10)
}
