'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listDialCodes, parsePhone } from '@876/core/phone'
import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { EmailInput } from '@876/ui/email-input'
import { FormRow } from '@876/ui/form-row'
import { UserPlusIcon, XIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { PhoneInput, type PhoneInputValue } from '@876/ui/phone-input'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'

import { client } from '@/lib/client'
import { customerTabPath } from '../_lib/customer-tabs'
import { useCustomerLinks } from '../_lib/use-customer-links'

const dialCodes = listDialCodes().map((country) => ({
  value: country.countryCode,
  label: `${country.flag}\u2002${country.dialCode}`,
  dialCode: country.dialCode,
}))

const DEFAULT_COUNTRY_CODE = 'JM'
const DEFAULT_DIAL_CODE = '+1'
const rowClassName = 'sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3'

type CustomerKind = 'INDIVIDUAL' | 'BUSINESS'

/**
 * Create, rendered in the card slot by `/customers/new`.
 *
 * It owns its own navigation rather than taking callbacks: it is a route now,
 * so closing means going back to the list and succeeding means going to the
 * customer that was just created — both carrying the list's query state.
 */
export function CustomerCreateCard({ className }: { className?: string }) {
  const router = useRouter()
  const linkTo = useCustomerLinks()
  const idempotencyKey = useRef(crypto.randomUUID())
  const [customerKind, setCustomerKind] = useState<CustomerKind>('INDIVIDUAL')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState<PhoneInputValue>({
    countryCode: DEFAULT_COUNTRY_CODE,
    dialCode: DEFAULT_DIAL_CODE,
    number: '',
  })
  const [ownerId, setOwnerId] = useState('')
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  )
  const [creating, setCreating] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (creating) return

    setCreating(true)
    setError(null)

    const rawPhone = phone.number.trim()
    const submittedPhone = rawPhone
      ? rawPhone.startsWith('+')
        ? rawPhone
        : `${phone.dialCode}${rawPhone.replace(/\D/g, '')}`
      : null

    const base = {
      customerKind,
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      companyName: companyName.trim() || null,
      email: email.trim() || null,
      phone: submittedPhone,
      ownerId: ownerId.trim() || null,
    }

    const result = await client.customers.create(base, idempotencyKey.current)

    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }

    router.push(linkTo(customerTabPath(result.data.profile.id, null)))
    router.refresh()
  }

  function onClose() {
    router.push(linkTo('/customers'))
  }

  return (
    <section
      aria-label="New customer"
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out',
        className
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-start justify-between gap-3.5 border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <UserPlusIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-foreground text-lg font-semibold tracking-tight">
              New customer
            </h2>
            <p className="text-muted-foreground text-xs">
              Add an individual or business customer record.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close customer creation"
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="876-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          <FormRow label="Customer type" required className={rowClassName}>
            <RadioGroup
              value={customerKind}
              onValueChange={(value) => setCustomerKind(value as CustomerKind)}
              disabled={creating}
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

          {customerKind === 'BUSINESS' ? (
            <FormRow
              htmlFor="create-company-name"
              label="Company"
              required
              className={rowClassName}
            >
              <Input
                id="create-company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                disabled={creating}
                required
              />
            </FormRow>
          ) : (
            <>
              <FormRow
                htmlFor="create-first-name"
                label="First name"
                className={rowClassName}
              >
                <Input
                  id="create-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={creating}
                />
              </FormRow>
              <FormRow
                htmlFor="create-last-name"
                label="Last name"
                className={rowClassName}
              >
                <Input
                  id="create-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={creating}
                />
              </FormRow>
            </>
          )}

          <FormRow
            htmlFor="create-email"
            label="Email"
            className={rowClassName}
          >
            <EmailInput
              id="create-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={creating}
            />
          </FormRow>

          <FormRow
            htmlFor="create-phone"
            label="Phone"
            className={rowClassName}
          >
            <PhoneInput
              id="create-phone"
              value={phone}
              onValueChange={setPhone}
              dialCodes={dialCodes}
              disabled={creating}
            />
          </FormRow>

          <FormRow
            htmlFor="create-owner"
            label="Owner ID"
            hint="Optional 876 user ID for the CRM owner."
            className={rowClassName}
          >
            <Input
              id="create-owner"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              disabled={creating}
            />
          </FormRow>

          {error ? (
            <AppError
              title="Customer could not be added"
              error={error}
              variant="form"
            />
          ) : null}
        </div>

        <div className="border-876-surface-border flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button type="submit" variant="info" disabled={creating}>
            {creating ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </form>
    </section>
  )
}
