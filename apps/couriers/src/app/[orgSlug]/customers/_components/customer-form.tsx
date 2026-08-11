'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { Switch } from '@876/ui/switch'
import { listDialCodes, parsePhone } from '@876/core/phone'

import { client } from '@/lib/client'
import type { CustomerKind, CustomerRow } from '@/types/customer'

const dialCodes = listDialCodes().map((country) => ({
  value: country.countryCode,
  label: `${country.flag} ${country.name} (${country.dialCode})`,
  dialCode: country.dialCode,
}))

const DEFAULT_COUNTRY_CODE = 'JM'
const DEFAULT_DIAL_CODE = '+1'

/**
 * Splits a stored E.164 number back into the two fields the input edits.
 *
 * The longest matching dial code wins: `+1` and `+1876` both prefix a Jamaican
 * number, and picking the shorter one leaves `876…` in the national field, which
 * is then re-submitted as a different number.
 */
function splitPhone(stored: string | null | undefined): PhoneInputValue {
  if (!stored)
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      dialCode: DEFAULT_DIAL_CODE,
      number: '',
    }

  // An unrecognized prefix keeps the raw value visible rather than silently
  // dropping digits the user would then have to notice were missing.
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
type Props = {
  orgSlug: string
  branches: { id: string; name: string }[]
  customer?: CustomerRow
}

export function CustomerForm({ orgSlug, branches, customer }: Props) {
  const router = useRouter()
  const [kind, setKind] = useState<CustomerKind>(
    customer?.customerKind ?? 'INDIVIDUAL'
  )
  const [firstName, setFirstName] = useState(customer?.firstName ?? '')
  const [lastName, setLastName] = useState(customer?.lastName ?? '')
  const [companyName, setCompanyName] = useState(customer?.companyName ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState<PhoneInputValue>(() =>
    splitPhone(customer?.phone)
  )
  const [branchId, setBranchId] = useState(customer?.branchId ?? '')
  const [trn, setTrn] = useState(customer?.trn ?? '')
  const [commercial, setCommercial] = useState(customer?.isCommercial ?? false)
  const [status, setStatus] = useState(customer?.status ?? 'ACTIVE')
  // Held across retries of the same submission and regenerated only after a
  // successful create, so a retry after a failed write reuses the registry
  // customer Billing already made instead of creating a second one.
  const submissionKey = useRef(crypto.randomUUID())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const identityLocked = customer?.customerType === 'CORE_USER'

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    // A CORE_USER's identity belongs to their 876 account, so the form must not
    // send those fields at all. Sending them unchanged would still read as an
    // identity edit server-side and reject a perfectly valid branch or TRN change.
    const identity = identityLocked
      ? {}
      : kind === 'INDIVIDUAL'
        ? {
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
          }
        : { companyName: companyName.trim() }
    if (
      !identityLocked &&
      ((kind === 'INDIVIDUAL' && !firstName.trim()) ||
        (kind === 'BUSINESS' && !companyName.trim()))
    ) {
      setError('Complete the required identity fields.')
      return
    }
    startTransition(async () => {
      // An emptied field has to travel as an explicit null. Sending undefined
      // makes JSON.stringify drop the key, the server reads that as "not
      // supplied", and the value can never be cleared through this form.
      const cleared = (next: string, previous: string | null | undefined) =>
        next ? next : previous ? null : undefined

      const submittedPhone = phone.number.trim()
        ? `${phone.dialCode}${phone.number.replace(/\D/g, '')}`
        : ''
      const emailValue = cleared(email.trim(), customer?.email)
      const phoneValue = cleared(submittedPhone, customer?.phone)
      const trnValue = cleared(trn.trim(), customer?.trn)

      const params = {
        ...identity,
        ...(identityLocked
          ? {}
          : {
              ...(emailValue === undefined ? {} : { email: emailValue }),
              ...(phoneValue === undefined ? {} : { phone: phoneValue }),
            }),
        branchId: branchId || undefined,
        ...(trnValue === undefined ? {} : { trn: trnValue }),
        isCommercial: commercial,
      }

      // Built per branch rather than as one object with a conditional tail: the
      // two endpoints take different contracts, and a merged shape types as the
      // union of both, which satisfies neither.
      const result = customer
        ? await client.customers.update(orgSlug, customer.id, {
            ...params,
            status,
          })
        : await client.customers.create(orgSlug, {
            ...params,
            customerKind: kind,
            idempotencyKey: submissionKey.current,
          })
      if (result.error) {
        setError(result.error.message)
        return
      }
      if (!customer) submissionKey.current = crypto.randomUUID()
      router.push(
        customer
          ? `/${orgSlug}/customers/${customer.id}`
          : `/${orgSlug}/customers`
      )
      router.refresh()
    })
  }
  return (
    <form className="max-w-3xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        <FormRow
          label="Customer type"
          hint="This cannot be changed after the customer is added."
        >
          <RadioGroup
            value={kind}
            onValueChange={(value) => setKind(value as CustomerKind)}
            disabled={isPending || Boolean(customer)}
            className="flex gap-6 pt-2"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="INDIVIDUAL" />
              Individual
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="BUSINESS" />
              Business
            </label>
          </RadioGroup>
        </FormRow>
        {kind === 'INDIVIDUAL' ? (
          <>
            <FormRow
              htmlFor="customer-first-name"
              label="First name"
              required
              hint={
                identityLocked
                  ? "Identity comes from this customer's 876 account."
                  : undefined
              }
            >
              <Input
                id="customer-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={isPending || identityLocked}
                required
              />
            </FormRow>
            <FormRow
              htmlFor="customer-last-name"
              label="Last name"
              hint={
                identityLocked
                  ? "Identity comes from this customer's 876 account."
                  : undefined
              }
            >
              <Input
                id="customer-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={isPending || identityLocked}
              />
            </FormRow>
          </>
        ) : (
          <FormRow
            htmlFor="customer-company-name"
            label="Company name"
            required
          >
            <Input
              id="customer-company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              disabled={isPending || identityLocked}
              required
            />
          </FormRow>
        )}
        <FormRow
          htmlFor="customer-email"
          label="Email"
          hint={
            identityLocked
              ? "Identity comes from this customer's 876 account."
              : undefined
          }
        >
          <EmailInput
            id="customer-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending || identityLocked}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-phone"
          label="Phone"
          hint={
            identityLocked
              ? "Identity comes from this customer's 876 account."
              : undefined
          }
        >
          <PhoneInput
            id="customer-phone"
            value={phone}
            onValueChange={setPhone}
            dialCodes={dialCodes}
            disabled={isPending || identityLocked}
          />
        </FormRow>
        <FormRow label="Home branch">
          <Select
            value={branchId}
            onValueChange={(value) => setBranchId(value ?? '')}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Default branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default branch</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow htmlFor="customer-trn" label="TRN">
          <Input
            id="customer-trn"
            value={trn}
            onChange={(event) => setTrn(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        <FormRow label="Commercial account">
          <Switch
            checked={commercial}
            onCheckedChange={setCommercial}
            disabled={isPending}
          />
        </FormRow>
        {customer ? (
          <FormRow label="Status">
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
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
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
