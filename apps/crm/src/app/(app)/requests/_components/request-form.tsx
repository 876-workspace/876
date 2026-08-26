'use client'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
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
      ? await client.requests.update(requestId, { ...base, status: values.status })
      : await client.requests.create({ ...base, customerId: values.customerId })

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    router.replace(`/requests/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <Field label="Customer">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={values.customerId}
          onChange={(event) => set('customerId', event.target.value)}
          disabled={Boolean(requestId)}
          required
        >
          <option value="">Select customer</option>
          {customers.map(({ profile, customer }) => (
            <option key={profile.id} value={profile.id}>
              {customer?.name ?? profile.billingCustomerId}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Subject">
        <Input value={values.subject} onChange={(event) => set('subject', event.target.value)} required />
      </Field>

      <Field label="Description">
        <textarea
          className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Category" value={values.category} onChange={(value) => set('category', value as RequestCategory)} options={['GENERAL', 'SUPPORT', 'BILLING', 'SALES', 'COMPLAINT', 'FEEDBACK', 'OTHER']} />
        <SelectField label="Priority" value={values.priority} onChange={(value) => set('priority', value as RequestPriority)} options={['LOW', 'NORMAL', 'HIGH', 'URGENT']} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Source" value={values.source} onChange={(value) => set('source', value as RequestSource)} options={['CRM', 'EMAIL', 'PHONE', 'CHAT', 'WEB', 'API', 'OTHER']} />
        {requestId ? (
          <SelectField label="Status" value={values.status} onChange={(value) => set('status', value as RequestStatus)} options={['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'CANCELLED']} />
        ) : null}
      </div>

      <Field label="Assignee ID">
        <Input value={values.assigneeId} onChange={(event) => set('assigneeId', event.target.value)} placeholder="Optional 876 user ID" />
      </Field>

      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" variant="info" disabled={saving}>{saving ? 'Saving…' : 'Save request'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <select
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
        ))}
      </select>
    </Field>
  )
}

export type { Values as RequestFormValues }
