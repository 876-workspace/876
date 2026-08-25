'use client'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
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
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
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
      setSaving(false)
      return
    }

    const id = customerId ?? ((result.data as { profile: { id: string } }).profile.id)
    router.replace(`/customers/${id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Customer type</label>
        <div className="flex gap-5 text-sm">
          {(['INDIVIDUAL', 'BUSINESS'] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-2">
              <input
                type="radio"
                checked={values.customerKind === kind}
                onChange={() => set('customerKind', kind)}
                disabled={!editableIdentity}
              />
              {kind === 'INDIVIDUAL' ? 'Individual' : 'Business'}
            </label>
          ))}
        </div>
      </div>

      {values.customerKind === 'BUSINESS' ? (
        <Field label="Company name">
          <Input value={values.companyName} onChange={(e) => set('companyName', e.target.value)} disabled={!editableIdentity} />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} disabled={!editableIdentity} /></Field>
          <Field label="Last name"><Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} disabled={!editableIdentity} /></Field>
        </div>
      )}

      <Field label="Email"><Input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} disabled={!editableIdentity} /></Field>
      <Field label="Phone"><Input value={values.phone} onChange={(e) => set('phone', e.target.value)} disabled={!editableIdentity} /></Field>
      <Field label="Owner ID"><Input value={values.ownerId} onChange={(e) => set('ownerId', e.target.value)} placeholder="Optional 876 user ID" /></Field>

      {customerId ? (
        <Field label="CRM status">
          <select
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={values.status}
            onChange={(e) => set('status', e.target.value as Values['status'])}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      ) : null}

      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" variant="info" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>
}

export type { Values as CustomerFormValues }
