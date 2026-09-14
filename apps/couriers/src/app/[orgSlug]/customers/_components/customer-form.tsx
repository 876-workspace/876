'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
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
import { SearchableSelect } from '@876/ui/searchable-select'
import { listDialCodes, parsePhone } from '@876/core/phone'

import { client } from '@/lib/client'
import type { CustomerRow, GlobalCustomerOption } from '@/types/customer'
import {
  CustomerBranchField,
  type CustomerBranchOption,
} from './customer-branch-field'

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

  // An unrecognized prefix keeps the raw value visible rather than silently
  // dropping digits the user would then have to notice were missing.
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
  branches: CustomerBranchOption[] | Promise<CustomerBranchOption[]>
  customer?: CustomerRow
}

export function CustomerForm({ orgSlug, branches, customer }: Props) {
  const router = useRouter()
  const kind = customer?.customerKind ?? 'INDIVIDUAL'
  const [newCustomerKind, setNewCustomerKind] = useState(kind)
  const [registryQuery, setRegistryQuery] = useState('')
  const [registryCustomers, setRegistryCustomers] = useState<
    GlobalCustomerOption[]
  >([])
  const [registryError, setRegistryError] = useState<string | null>(null)
  const [registryLoading, setRegistryLoading] = useState(false)
  const [selectedRegistryCustomer, setSelectedRegistryCustomer] =
    useState<GlobalCustomerOption | null>(null)
  const [firstName, setFirstName] = useState(customer?.firstName ?? '')
  const [lastName, setLastName] = useState(customer?.lastName ?? '')
  const [companyName, setCompanyName] = useState(customer?.companyName ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState<PhoneInputValue>(() =>
    splitPhone(customer?.phone)
  )
  const [branchId, setBranchId] = useState(
    customer?.branchId ??
      (Array.isArray(branches) && branches.length === 1
        ? (branches[0]?.id ?? '')
        : '')
  )
  const [branchesReady, setBranchesReady] = useState(Array.isArray(branches))
  const [trn, setTrn] = useState(customer?.trn ?? '')
  const [status, setStatus] = useState(customer?.status ?? 'ACTIVE')
  // Held across retries of the same submission and regenerated only after a
  // successful create, so a retry after a failed write reuses the registry
  // customer Billing already made instead of creating a second one.
  const submissionKey = useRef(crypto.randomUUID())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const identityLocked =
    customer?.customerType === 'CORE_USER' || selectedRegistryCustomer !== null
  const handleBranchesReady = useCallback(() => setBranchesReady(true), [])
  const isRegistrySearchActive = !customer && registryQuery.trim().length >= 2

  useEffect(() => {
    if (!isRegistrySearchActive) return
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setRegistryLoading(true)
      setRegistryError(null)
      try {
        const query = new URLSearchParams({
          orgSlug,
          q: registryQuery.trim(),
        })
        const response = await fetch(
          `/api/manage/customers/registry?${query}`,
          {
            signal: controller.signal,
          }
        )
        const result = (await response.json()) as {
          data: GlobalCustomerOption[] | null
          error: { message: string } | null
        }
        if (!response.ok || !result.data) {
          setRegistryError(
            result.error?.message ?? 'Customers could not be loaded.'
          )
          return
        }
        setRegistryCustomers(result.data)
      } catch (reason) {
        if (!controller.signal.aborted)
          setRegistryError(
            reason instanceof Error
              ? reason.message
              : 'Customers could not be loaded.'
          )
      } finally {
        if (!controller.signal.aborted) setRegistryLoading(false)
      }
    }, 200)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [isRegistrySearchActive, orgSlug, registryQuery])

  function selectRegistryCustomer(customerId: string) {
    const next =
      registryCustomers.find((item) => item.id === customerId) ?? null
    if (!next) {
      setSelectedRegistryCustomer(null)
      return
    }
    if (next.enrolled) {
      setError('This party is already a Couriers customer.')
      return
    }
    setSelectedRegistryCustomer(next)
    setNewCustomerKind(next.customerKind)
    setFirstName(next.firstName ?? '')
    setLastName(next.lastName ?? '')
    setCompanyName(next.companyName ?? '')
    setEmail(next.email ?? '')
    setPhone(splitPhone(next.phone))
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const activeKind = customer?.customerKind ?? newCustomerKind
    // A CORE_USER's identity belongs to their 876 account, so the form must not
    // send those fields at all. Sending them unchanged would still read as an
    // identity edit server-side and reject a perfectly valid branch or TRN change.
    const identity = identityLocked
      ? {}
      : activeKind === 'INDIVIDUAL'
        ? {
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
          }
        : { companyName: companyName.trim() }
    if (
      !identityLocked &&
      ((activeKind === 'INDIVIDUAL' && !firstName.trim()) ||
        (activeKind === 'INDIVIDUAL' && !lastName.trim()) ||
        (activeKind === 'BUSINESS' && !companyName.trim()) ||
        (!customer && !selectedRegistryCustomer && !email.trim()))
    ) {
      setError('Complete the required identity fields.')
      return
    }
    if (!branchId) {
      setError('Select a branch.')
      return
    }
    startTransition(async () => {
      // An emptied field has to travel as an explicit null. Sending undefined
      // makes JSON.stringify drop the key, the server reads that as "not
      // supplied", and the value can never be cleared through this form.
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
      const trnValue = cleared(trn.trim(), customer?.trn)

      const params = {
        ...identity,
        ...(identityLocked
          ? {}
          : {
              ...(emailValue === undefined ? {} : { email: emailValue }),
              ...(phoneValue === undefined ? {} : { phone: phoneValue }),
            }),
        branchId,
        ...(trnValue === undefined ? {} : { trn: trnValue }),
        ...(customer ? {} : { isCommercial: false }),
      }

      // Built per branch rather than as one object with a conditional tail: the
      // two endpoints take different contracts, and a merged shape types as the
      // union of both, which satisfies neither.
      const result = customer
        ? await client.customers.update(orgSlug, customer.id, {
            ...params,
            status,
          })
        : await client.customers.create(
            orgSlug,
            selectedRegistryCustomer
              ? {
                  source: 'registry',
                  billingCustomerId: selectedRegistryCustomer.id,
                  branchId,
                  isCommercial: false,
                }
              : {
                  source: 'party',
                  idempotencyKey: submissionKey.current,
                  party: {
                    customerKind: activeKind,
                    ...identity,
                    ...(email.trim() ? { email: email.trim() } : {}),
                    ...(submittedPhone ? { phone: submittedPhone } : {}),
                  },
                  branchId,
                  ...(trnValue === undefined ? {} : { trn: trnValue }),
                  isCommercial: false,
                }
          )
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
        {!customer ? (
          <FormRow
            htmlFor="customer-registry"
            label="Customer"
            className={customerFormRowClassName}
          >
            <SearchableSelect
              id="customer-registry"
              options={(isRegistrySearchActive ? registryCustomers : []).map(
                (item) => ({
                  value: item.id,
                  label: `${item.name}${item.enrolled ? ' — Already a customer' : ''}`,
                })
              )}
              value={selectedRegistryCustomer?.id ?? ''}
              onValueChange={selectRegistryCustomer}
              onSearchChange={setRegistryQuery}
              placeholder="Search customers or enter a new one"
              searchPlaceholder="Search customers…"
              emptyMessage="No matches"
              loading={isRegistrySearchActive && registryLoading}
              error={isRegistrySearchActive ? registryError : null}
              disabled={isPending}
            />
          </FormRow>
        ) : null}
        {!customer && !selectedRegistryCustomer ? (
          <FormRow label="Type" className={customerFormRowClassName}>
            <Select
              value={newCustomerKind}
              onValueChange={(value) =>
                setNewCustomerKind(value as typeof newCustomerKind)
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        ) : null}
        {(customer?.customerKind ?? newCustomerKind) === 'INDIVIDUAL' ? (
          <FormRow
            label="Name"
            required
            className={customerFormRowClassName}
            hint={
              identityLocked
                ? "Identity comes from this customer's 876 account."
                : undefined
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="customer-first-name"
                aria-label="First name"
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={isPending || identityLocked}
                required={!identityLocked}
              />
              <Input
                id="customer-last-name"
                aria-label="Last name"
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={isPending || identityLocked}
                required={!identityLocked}
              />
            </div>
          </FormRow>
        ) : (
          <FormRow
            htmlFor="customer-company-name"
            label="Company name"
            required
            className={customerFormRowClassName}
          >
            <Input
              id="customer-company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              disabled={isPending || identityLocked}
              required={!identityLocked}
            />
          </FormRow>
        )}
        <FormRow
          htmlFor="customer-email"
          label="Email"
          required={!customer && !selectedRegistryCustomer}
          className={customerFormRowClassName}
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
            required={!customer && !selectedRegistryCustomer}
          />
        </FormRow>
        <FormRow
          htmlFor="customer-phone"
          label="Phone"
          className={customerFormRowClassName}
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
        <CustomerBranchField
          branches={branches}
          value={branchId}
          onValueChange={setBranchId}
          onBranchesReady={handleBranchesReady}
          disabled={isPending}
          className={customerFormRowClassName}
        />
        <FormRow
          htmlFor="customer-trn"
          label="TRN"
          className={customerFormRowClassName}
          hint="Required to start receiving packages."
        >
          <Input
            id="customer-trn"
            value={trn}
            onChange={(event) => setTrn(event.target.value)}
            disabled={isPending}
          />
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
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        ) : null}
      </div>
      {error ? <div className="text-destructive text-sm">{error}</div> : null}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="info"
          disabled={isPending || !branchesReady}
        >
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
