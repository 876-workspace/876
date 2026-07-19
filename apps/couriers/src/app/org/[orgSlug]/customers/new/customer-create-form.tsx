'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import type { BillingCustomer } from '@876/billing/integration'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { request } from '@/lib/client/request'
import type { CustomerCreateInput } from '@/types/customer-management'

type Props = {
  customersHref: string
  orgSlug: string
}

export function CustomerCreateForm({ customersHref, orgSlug }: Props) {
  const router = useRouter()
  const [customerKind, setCustomerKind] = useState<'INDIVIDUAL' | 'BUSINESS'>(
    'INDIVIDUAL'
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const payload: CustomerCreateInput = {
      customerKind,
      name: String(form.get('name') ?? '').trim(),
      firstName: optionalFormValue(form, 'firstName'),
      lastName: optionalFormValue(form, 'lastName'),
      companyName:
        customerKind === 'BUSINESS'
          ? optionalFormValue(form, 'companyName')
          : undefined,
      email: optionalFormValue(form, 'email'),
      phone: optionalFormValue(form, 'phone'),
      customerNumber: optionalFormValue(form, 'customerNumber'),
      website: optionalFormValue(form, 'website'),
      taxRegistrationNumber: optionalFormValue(form, 'taxRegistrationNumber'),
      notes: optionalFormValue(form, 'notes'),
    }
    const result = await request<BillingCustomer>('/api/manage/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-876-org-slug': orgSlug,
      },
      body: JSON.stringify(payload),
    })

    if (result.error) {
      setError(result.error.message)
      setPending(false)
      return
    }

    router.push(customersHref)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="grid gap-5 rounded-lg border p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-kind">Kind</Label>
          <NativeSelect
            id="customer-kind"
            className="w-full"
            value={customerKind}
            onChange={(event) =>
              setCustomerKind(
                event.currentTarget.value as 'INDIVIDUAL' | 'BUSINESS'
              )
            }
            disabled={pending}
          >
            <NativeSelectOption value="INDIVIDUAL">
              Individual
            </NativeSelectOption>
            <NativeSelectOption value="BUSINESS">Business</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="customer-name">Name</Label>
          <Input
            id="customer-name"
            name="name"
            required
            autoComplete="name"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            name="firstName"
            autoComplete="given-name"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            name="lastName"
            autoComplete="family-name"
            disabled={pending}
          />
        </div>

        {customerKind === 'BUSINESS' && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company-name">Company</Label>
            <Input
              id="company-name"
              name="companyName"
              autoComplete="organization"
              disabled={pending}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            name="email"
            type="email"
            autoComplete="email"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-phone">Phone</Label>
          <Input
            id="customer-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-number">Customer number</Label>
          <Input
            id="customer-number"
            name="customerNumber"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-website">Website</Label>
          <Input
            id="customer-website"
            name="website"
            type="url"
            autoComplete="url"
            disabled={pending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tax-registration-number">
            Tax registration number
          </Label>
          <Input
            id="tax-registration-number"
            name="taxRegistrationNumber"
            disabled={pending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="customer-notes">Notes</Label>
          <Textarea
            id="customer-notes"
            name="notes"
            rows={4}
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="info" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </Button>
        <Link
          href={customersHref}
          className={buttonVariants({ variant: 'outline' })}
          aria-disabled={pending}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

function optionalFormValue(
  form: FormData,
  field: keyof CustomerCreateInput
): string | undefined {
  const value = String(form.get(field) ?? '').trim()

  return value || undefined
}
