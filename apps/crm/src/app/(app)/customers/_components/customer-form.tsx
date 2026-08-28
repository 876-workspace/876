'use client'

import { listDialCodes, parsePhone } from '@876/core/phone'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { EmailInput } from '@876/ui/email-input'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { PhoneInput, type PhoneInputValue } from '@876/ui/phone-input'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { client } from '@/lib/client'

type ErrorValue = { code: string; message: string }

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

const dialCodes = listDialCodes().map((country) => ({
  value: country.countryCode,
  label: `${country.flag}\u2002${country.dialCode}`,
  dialCode: country.dialCode,
}))

const DEFAULT_COUNTRY_CODE = 'JM'
const DEFAULT_DIAL_CODE = '+1'
const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

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
  const [phone, setPhone] = useState<PhoneInputValue>(() =>
    splitPhone(initial.phone)
  )
  const [error, setError] = useState<ErrorValue | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)

    const rawPhone = phone.number.trim()
    const submittedPhone = rawPhone
      ? rawPhone.startsWith('+')
        ? rawPhone
        : `${phone.dialCode}${rawPhone.replace(/\D/g, '')}`
      : null

    const base = {
      customerKind: values.customerKind,
      firstName: values.firstName.trim() || null,
      lastName: values.lastName.trim() || null,
      companyName: values.companyName.trim() || null,
      email: values.email.trim() || null,
      phone: submittedPhone,
      ownerId: values.ownerId.trim() || null,
    }

    const result = customerId
      ? await client.customers.update(customerId, {
          ...base,
          status: values.status,
        })
      : await client.customers.create(base, idempotencyKey.current)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    const id = customerId ?? result.data.profile.id
    router.replace(`/customers/${id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <div className="876-card space-y-5 p-5">
        <FormRow label="Customer type" required className={rowClassName}>
          <RadioGroup
            value={values.customerKind}
            onValueChange={(value) =>
              set('customerKind', value as Values['customerKind'])
            }
            disabled={!editableIdentity || saving}
            className="flex gap-6 pt-1.5"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="INDIVIDUAL" />
              Individual
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="BUSINESS" />
              Business
            </label>
          </RadioGroup>
        </FormRow>

        {values.customerKind === 'BUSINESS' ? (
          <FormRow
            htmlFor="customer-company-name"
            label="Company"
            required
            className={rowClassName}
          >
            <Input
              id="customer-company-name"
              value={values.companyName}
              onChange={(event) => set('companyName', event.target.value)}
              disabled={!editableIdentity || saving}
              required
            />
          </FormRow>
        ) : (
          <>
            <FormRow
              htmlFor="customer-first-name"
              label="First name"
              className={rowClassName}
            >
              <Input
                id="customer-first-name"
                value={values.firstName}
                onChange={(event) => set('firstName', event.target.value)}
                disabled={!editableIdentity || saving}
              />
            </FormRow>
            <FormRow
              htmlFor="customer-last-name"
              label="Last name"
              className={rowClassName}
            >
              <Input
                id="customer-last-name"
                value={values.lastName}
                onChange={(event) => set('lastName', event.target.value)}
                disabled={!editableIdentity || saving}
              />
            </FormRow>
          </>
        )}

        <FormRow
          htmlFor="customer-email"
          label="Email"
          className={rowClassName}
        >
          <EmailInput
            id="customer-email"
            value={values.email}
            onChange={(event) => set('email', event.target.value)}
            disabled={!editableIdentity || saving}
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
            disabled={!editableIdentity || saving}
          />
        </FormRow>

        <FormRow
          htmlFor="customer-owner"
          label="Owner"
          hint="Optional 876 user ID for the CRM owner of this relationship."
          className={rowClassName}
        >
          <Input
            id="customer-owner"
            value={values.ownerId}
            onChange={(event) => set('ownerId', event.target.value)}
            disabled={saving}
          />
        </FormRow>

        {customerId ? (
          <FormRow label="Status" className={rowClassName}>
            <Select
              value={values.status}
              onValueChange={(value) =>
                set('status', value as Values['status'])
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        ) : null}
      </div>

      {error ? (
        <AppError
          title={customerId ? 'Customer could not be saved' : 'Customer could not be added'}
          error={error}
          variant="form"
        />
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={saving}>
          {customerId ? 'Save' : 'Add'}
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

export type { Values as CustomerFormValues }
