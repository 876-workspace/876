'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'

export function CustomerCreateForm({
  organizationId,
  orgSlug,
}: {
  organizationId: string
  orgSlug: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listHref = `/orgs/${orgSlug}/billing/customers`

  function create() {
    if (!name.trim()) return
    setError(null)

    startTransition(async () => {
      const result = await client.billingIntegrations.createCustomer(
        organizationId,
        {
          name: name.trim(),
          customerKind: companyName.trim() ? 'BUSINESS' : 'INDIVIDUAL',
          companyName: companyName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          customerType: 'EXTERNAL',
        }
      )
      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(listHref)
      router.refresh()
    })
  }

  return (
    <div className="876-card max-w-2xl space-y-4 p-5">
      <Field label="Display name" value={name} onChange={setName} required />
      <Field
        label="Company name"
        value={companyName}
        onChange={setCompanyName}
      />
      <Field label="Email" value={email} onChange={setEmail} type="email" />
      <Field label="Phone" value={phone} onChange={setPhone} />
      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          variant="outline"
          onClick={() => router.push(listHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={create} disabled={isPending || !name.trim()}>
          {isPending ? 'Creating…' : 'Create customer'}
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  const id = `customer-${label.toLowerCase().replaceAll(' ', '-')}`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </div>
  )
}
