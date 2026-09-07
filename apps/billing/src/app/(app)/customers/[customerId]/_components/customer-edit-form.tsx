'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { listDialCodes, parsePhone } from '@876/core/phone'
import { Button } from '@876/ui/button'
import { EmailInput } from '@876/ui/email-input'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { PhoneInput, type PhoneInputValue } from '@876/ui/phone-input'
import { Textarea } from '@876/ui/textarea'

import { request } from '@/lib/client/request'

export type CustomerEditValues = {
  id: string
  name: string
  companyName: string | null
  email: string | null
  phone: string | null
  website: string | null
  taxRegistrationNumber: string | null
  notes: string | null
}

const dialCodes = listDialCodes().map((country) => ({
  value: country.countryCode,
  label: `${country.flag}\u2002${country.dialCode}`,
  dialCode: country.dialCode,
}))

const DEFAULT_COUNTRY_CODE = 'JM'
const DEFAULT_DIAL_CODE = '+1'
const rowClassName = 'sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3'

function splitPhone(stored: string | null): PhoneInputValue {
  if (!stored)
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      dialCode: DEFAULT_DIAL_CODE,
      number: '',
    }

  const parsed = parsePhone(stored, DEFAULT_COUNTRY_CODE)
  if (!parsed)
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      dialCode: DEFAULT_DIAL_CODE,
      number: stored,
    }

  return {
    countryCode: parsed.countryCode ?? DEFAULT_COUNTRY_CODE,
    dialCode: parsed.dialCode,
    number: `${parsed.areaCode ?? ''}${parsed.nationalNumber}`,
  }
}

export function CustomerEditForm({
  customer,
  currency,
}: {
  customer: CustomerEditValues
  currency: string
}) {
  const router = useRouter()
  const [name, setName] = useState(customer.name)
  const [companyName, setCompanyName] = useState(customer.companyName ?? '')
  const [email, setEmail] = useState(customer.email ?? '')
  const [phone, setPhone] = useState<PhoneInputValue>(() =>
    splitPhone(customer.phone)
  )
  const [website, setWebsite] = useState(customer.website ?? '')
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(
    customer.taxRegistrationNumber ?? ''
  )
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Complete the required identity fields.')
      return
    }

    const rawPhone = phone.number.trim()
    const phoneValue = rawPhone
      ? rawPhone.startsWith('+')
        ? rawPhone
        : `${phone.dialCode}${rawPhone.replace(/\D/g, '')}`
      : null

    const params = {
      name: name.trim(),
      companyName: companyName.trim() || null,
      email: email.trim() || null,
      phone: phoneValue,
      website: website.trim() || null,
      taxRegistrationNumber: taxRegistrationNumber.trim() || null,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      const result = await request<{ object: 'customer'; id: string }>(
        `/api/v1/customers/${encodeURIComponent(customer.id)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      )
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Unable to save customer.')
        return
      }

      router.push(`/customers/${customer.id}`)
      router.refresh()
    })
  }

  return (
    <form className="max-w-3xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        <FormRow
          htmlFor="customer-name"
          label="Name"
          required
          className={rowClassName}
        >
          <Input
            id="customer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            required
          />
        </FormRow>
        <FormRow
          htmlFor="customer-company"
          label="Company name"
          className={rowClassName}
        >
          <Input
            id="customer-company"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-email"
          label="Email"
          className={rowClassName}
        >
          <EmailInput
            id="customer-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-phone"
          label="Phone"
          className={rowClassName}
        >
          <PhoneInput
            id="customer-phone"
            value={phone}
            onValueChange={setPhone}
            dialCodes={dialCodes}
            disabled={isPending}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-website"
          label="Website"
          className={rowClassName}
        >
          <Input
            id="customer-website"
            type="url"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-tax-registration-number"
          label="Tax registration number"
          className={rowClassName}
        >
          <Input
            id="customer-tax-registration-number"
            value={taxRegistrationNumber}
            onChange={(event) => setTaxRegistrationNumber(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-currency"
          label="Currency"
          hint="The organization bills in one currency."
          className={rowClassName}
        >
          <Input id="customer-currency" value={currency} readOnly disabled />
        </FormRow>
        <FormRow
          htmlFor="customer-notes"
          label="Notes"
          className={rowClassName}
        >
          <Textarea
            id="customer-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
      </div>
      {error ? (
        <div className="text-destructive text-sm" role="alert">
          {error}
        </div>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={isPending}>
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
