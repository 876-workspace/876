'use client'

import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { client } from '@/lib/client'

type Values = {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  ownerId: string
  status: 'ACTIVE' | 'INACTIVE'
}

const EMPTY: Values = {
  customerKind: 'INDIVIDUAL',
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  phone: '',
  ownerId: '',
  status: 'ACTIVE',
}

export function CustomerForm({
  customerId,
  initial = EMPTY,
  editableIdentity = true,
}: {
  customerId?: string
  initial?: Values
  editableIdentity?: boolean
}) {
  const router = useRouter()
  const idempotencyKey = useRef(crypto.randomUUID())
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const base = {
      customerKind: values.customerKind,
      firstName: values.firstName.trim() || null,
      lastName: values.lastName.trim() || null,
      companyName: values.companyName.trim() || null,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      ownerId: values.ownerId.trim() || null,
    }
    const result = customerId
      ? await client.customers.update(customerId, { ...base, status: values.status })
      : await client.customers.create(base, idempotencyKey.current)

    if (result.error) {
      setError(result.error.message)
      setSubmitting(false)
      return
    }

    const id = customerId ?? (result.data as { profile: { id: string } }).profile.id
    router.replace(`/customers/${id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <FormRow label="Customer type" required>
        <div className="flex gap-6 pt-1">
          {(['INDIVIDUAL', 'BUSINESS'] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="customerKind"
                value={kind}
                checked={values.customerKind === kind}
                onChange={() => set('customerKind', kind)}
                disabled={!editableIdentity}
              />
              {kind === 'INDIVIDUAL' ? 'Individual' : 'Business'}
            </label>
          ))}
        </div>
      </FormRow>

      {values.customerKind === 'BUSINESS' ? (
        <FormRow label="Company name" required>
          <Input value={values.companyName} onChange={(e) => set('companyName', e.target.value)} disabled={!editableIdentity} maxLength={160} />
        </FormRow>
      ) : (
        <FormRow label="Name" required>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="first-name">First name</Label><Input id="first-name" value={values.firstName} onChange={(e) => set('firstName', e.target.value)} disabled={!editableIdentity} maxLength={160} /></div>
            <div><Label htmlFor="last-name">Last name</Label><Input id="last-name" value={values.lastName} onChange={(e) => set('lastName', e.target.value)} disabled={!editableIdentity} maxLength={160} /></div>
          </div>
        </FormRow>
      )}

      <FormRow label="Email"><Input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} disabled={!editableIdentity} maxLength={254} /></FormRow>
      <FormRow label="Phone"><Input value={values.phone} onChange={(e) => set('phone', e.target.value)} disabled={!editableIdentity} maxLength={40} /></FormRow>
      <FormRow label="Owner"><Input value={values.ownerId} onChange={(e) => set('ownerId', e.target.value)} placeholder="876 user ID (optional)" maxLength={160} /></FormRow>

      {customerId ? (
        <FormRow label="Status">
          <select className="border-input bg-background h-9 rounded-md border px-3 text-sm" value={values.status} onChange={(e) => set('status', e.target.value as Values['status'])}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </FormRow>
      ) : null}

      {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" variant="info" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}

export type { Values as CustomerFormValues }
