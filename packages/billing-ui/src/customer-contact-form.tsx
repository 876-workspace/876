'use client'

import { useState, useTransition } from 'react'
import type { CustomerContactCreateParams } from '@876/billing'
import { listDialCodes, parsePhone } from '@876/core/phone'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { EmailInput } from '@876/ui/email-input'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { PhoneInput, type PhoneInputValue } from '@876/ui/phone-input'
import { Spinner } from '@876/ui/spinner'
import Link from 'next/link'

const dialCodes = listDialCodes().map((country) => ({
  value: country.countryCode,
  label: `${country.flag}\u2002${country.dialCode}`,
  dialCode: country.dialCode,
}))
const defaultPhone: PhoneInputValue = {
  countryCode: 'JM',
  dialCode: '+1',
  number: '',
}

export function CustomerContactForm({
  initial,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial?: Partial<CustomerContactCreateParams>
  submitLabel: string
  cancelHref: string
  onSubmit: (
    params: CustomerContactCreateParams
  ) => Promise<{ error: { code: string; message: string } | null }>
}) {
  const [salutation, setSalutation] = useState(initial?.salutation ?? '')
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [workPhone, setWorkPhone] = useState(() =>
    splitPhone(initial?.workPhone)
  )
  const [mobilePhone, setMobilePhone] = useState(() =>
    splitPhone(initial?.mobilePhone)
  )
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false)
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  )
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const params: CustomerContactCreateParams = {
      salutation: optional(salutation),
      firstName: optional(firstName),
      lastName: optional(lastName),
      email: optional(email),
      workPhone: phoneValue(workPhone),
      mobilePhone: phoneValue(mobilePhone),
      isPrimary,
    }
    startTransition(async () => {
      const result = await onSubmit(params)
      if (result.error) setError(result.error)
    })
  }

  return (
    <form className="max-w-3xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        <FormRow htmlFor="contact-salutation" label="Salutation">
          <Input
            id="contact-salutation"
            value={salutation}
            onChange={(event) => setSalutation(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="contact-first-name" label="First name">
          <Input
            id="contact-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="contact-last-name" label="Last name">
          <Input
            id="contact-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="contact-email" label="Email">
          <EmailInput
            id="contact-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="contact-work-phone" label="Work phone">
          <PhoneInput
            id="contact-work-phone"
            value={workPhone}
            onValueChange={setWorkPhone}
            dialCodes={dialCodes}
            disabled={pending}
          />
        </FormRow>
        <FormRow htmlFor="contact-mobile-phone" label="Mobile phone">
          <PhoneInput
            id="contact-mobile-phone"
            value={mobilePhone}
            onValueChange={setMobilePhone}
            dialCodes={dialCodes}
            disabled={pending}
          />
        </FormRow>
        <FormRow label="Primary contact">
          <div className="flex items-center gap-2">
            <Checkbox
              id="contact-is-primary"
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
              disabled={pending}
            />
            <Label htmlFor="contact-is-primary" className="mb-0">
              Primary contact
            </Label>
          </div>
        </FormRow>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="info" disabled={pending}>
          {pending ? <Spinner /> : null}
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          render={<Link href={cancelHref} />}
        >
          Cancel
        </Button>
        {error ? (
          <AppError
            error={error}
            variant="inline"
            showCode
            className="ml-auto"
          />
        ) : null}
      </div>
    </form>
  )
}

function optional(value: string) {
  return value.trim() || null
}
function phoneValue(value: PhoneInputValue) {
  const number = value.number.trim()
  return number
    ? number.startsWith('+')
      ? number
      : `${value.dialCode}${number.replace(/\D/g, '')}`
    : null
}
function splitPhone(value: string | null | undefined): PhoneInputValue {
  if (!value) return defaultPhone
  const parsed = parsePhone(value, 'JM')
  return parsed
    ? {
        countryCode: parsed.countryCode ?? 'JM',
        dialCode: parsed.dialCode,
        number: `${parsed.areaCode ?? ''}${parsed.nationalNumber}`,
      }
    : { ...defaultPhone, number: value }
}
