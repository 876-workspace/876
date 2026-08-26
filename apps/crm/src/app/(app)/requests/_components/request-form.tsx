'use client'

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
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { client } from '@/lib/client'
import type {
  CrmCustomer,
  RequestCategory,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '@/types/crm'

type Values = {
  customerId: string
  subject: string
  description: string
  category: RequestCategory
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  assigneeId: string
}

const EMPTY: Values = {
  customerId: '',
  subject: '',
  description: '',
  category: 'GENERAL',
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
  assigneeId: '',
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function RequestForm({
  customers,
  requestId,
  initial = EMPTY,
}: {
  customers: CrmCustomer[]
  requestId?: string
  initial?: Values
}) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)

    const base = {
      subject: values.subject.trim(),
      description: values.description.trim() || null,
      category: values.category,
      priority: values.priority,
      source: values.source,
      assigneeId: values.assigneeId.trim() || null,
    }

    const result = requestId
      ? await client.requests.update(requestId, {
          ...base,
          status: values.status,
        })
      : await client.requests.create({
          ...base,
          customerId: values.customerId,
        })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    router.replace(`/requests/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="876-card space-y-5 p-5">
        <FormRow label="Customer" required className={rowClassName}>
          <Select
            value={values.customerId}
            onValueChange={(value) => set('customerId', value ?? '')}
            disabled={Boolean(requestId) || saving}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map(({ profile, customer }) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {customer?.name ?? profile.billingCustomerId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow
          htmlFor="request-subject"
          label="Subject"
          required
          className={rowClassName}
        >
          <Input
            id="request-subject"
            value={values.subject}
            onChange={(event) => set('subject', event.target.value)}
            disabled={saving}
            required
          />
        </FormRow>

        <FormRow
          htmlFor="request-description"
          label="Description"
          className={rowClassName}
        >
          <textarea
            id="request-description"
            className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            disabled={saving}
          />
        </FormRow>

        <FormRow label="Category" className={rowClassName}>
          <RequestSelect
            value={values.category}
            options={[
              'GENERAL',
              'SUPPORT',
              'BILLING',
              'SALES',
              'COMPLAINT',
              'FEEDBACK',
              'OTHER',
            ]}
            onValueChange={(value) => set('category', value as RequestCategory)}
            disabled={saving}
          />
        </FormRow>

        <FormRow label="Priority" className={rowClassName}>
          <RequestSelect
            value={values.priority}
            options={['LOW', 'NORMAL', 'HIGH', 'URGENT']}
            onValueChange={(value) => set('priority', value as RequestPriority)}
            disabled={saving}
          />
        </FormRow>

        <FormRow label="Source" className={rowClassName}>
          <RequestSelect
            value={values.source}
            options={['CRM', 'EMAIL', 'PHONE', 'CHAT', 'WEB', 'API', 'OTHER']}
            onValueChange={(value) => set('source', value as RequestSource)}
            disabled={saving}
          />
        </FormRow>

        {requestId ? (
          <FormRow label="Status" className={rowClassName}>
            <RequestSelect
              value={values.status}
              options={[
                'OPEN',
                'IN_PROGRESS',
                'WAITING',
                'RESOLVED',
                'CLOSED',
                'CANCELLED',
              ]}
              onValueChange={(value) => set('status', value as RequestStatus)}
              disabled={saving}
            />
          </FormRow>
        ) : null}

        <FormRow
          htmlFor="request-assignee"
          label="Assignee"
          hint="Optional 876 user ID for the person responsible for this request."
          className={rowClassName}
        >
          <Input
            id="request-assignee"
            value={values.assigneeId}
            onChange={(event) => set('assigneeId', event.target.value)}
            disabled={saving}
          />
        </FormRow>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={saving}>
          {requestId ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function RequestSelect({
  value,
  options,
  onValueChange,
  disabled,
}: {
  value: string
  options: readonly string[]
  onValueChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next ?? value)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option.replaceAll('_', ' ')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type { Values as RequestFormValues }
