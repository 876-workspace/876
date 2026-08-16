'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { EmailInput } from '@876/ui/email-input'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { PhoneInput, type PhoneInputValue } from '@876/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { listDialCodes, parsePhone } from '@876/core/phone'

import { client } from '@/lib/client'

export interface CustomerFormValues {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  companyName?: string | null
  status?: 'ACTIVE' | 'ARCHIVED'
}

const dialCodes = listDialCodes().map((country) => ({
  value: country.countryCode,
  label: `${country.flag}\u2002${country.dialCode}`,
  dialCode: country.dialCode,
}))

const DEFAULT_COUNTRY_CODE = 'JM'
const DEFAULT_DIAL_CODE = '+1'
const customerFormRowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

/**
 * Splits a stored E.164 number back into the country-aware phone picker.
 */
function splitPhone(stored: string | null | undefined): PhoneInputValue {
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

export function CustomerForm({
  currency,
  customer,
}: {
  /** The organization's operating currency. Display-only. */
  currency: string
  /** Present when editing; absent when creating. */
  customer?: CustomerFormValues
}) {
  const router = useRouter()
  const [name, setName] = useState(customer?.name ?? '')
  const [companyName, setCompanyName] = useState(customer?.companyName ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState<PhoneInputValue>(() =>
    splitPhone(customer?.phone)
  )
  const [status, setStatus] = useState(customer?.status ?? 'ACTIVE')

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Complete the required identity fields.')
      return
    }

    startTransition(async () => {
      const cleared = (next: string, previous: string | null | undefined) =>
        next ? next : previous ? null : undefined

      const rawPhone = phone.number.trim()
      const submittedPhone = rawPhone
        ? rawPhone.startsWith('+')
          ? rawPhone
          : `${phone.dialCode}${rawPhone.replace(/\D/g, '')}`
        : ''

      const emailValue = cleared(email.trim(), customer?.email)
      const phoneValue = cleared(submittedPhone, customer?.phone)
      const companyValue = cleared(companyName.trim(), customer?.companyName)

      const params = {
        name: name.trim(),
        ...(emailValue === undefined ? {} : { email: emailValue }),
        ...(phoneValue === undefined ? {} : { phone: phoneValue }),
        ...(companyValue === undefined ? {} : { companyName: companyValue }),
      }

      const result = customer
        ? await client.customers.update(customer.id, {
            ...params,
            status,
          })
        : await client.customers.create(params)

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(customer ? `/customers/${customer.id}` : `/customers`)
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
          className={customerFormRowClassName}
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
          htmlFor="customer-company-name"
          label="Company"
          className={customerFormRowClassName}
        >
          <Input
            id="customer-company-name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={isPending}
          />
        </FormRow>

        <FormRow
          htmlFor="customer-email"
          label="Email"
          className={customerFormRowClassName}
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
          className={customerFormRowClassName}
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
          htmlFor="customer-currency"
          label="Currency"
          className={customerFormRowClassName}
          hint="The organization bills in one currency."
        >
          <Input id="customer-currency" value={currency} readOnly disabled />
        </FormRow>

        {customer ? (
          <FormRow label="Status" className={customerFormRowClassName}>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        ) : null}
      </div>

      {error ? <div className="text-destructive text-sm">{error}</div> : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={isPending}>
          {customer ? 'Save' : 'Add'}
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
