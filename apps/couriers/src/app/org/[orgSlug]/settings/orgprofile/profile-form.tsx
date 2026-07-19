'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BuildingOffice2Icon } from '@876/ui/icons'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { request } from '@/lib/client/request'

/** The editable organization profile fields surfaced in Couriers. */
export type ProfileFormValues = {
  name: string
  short_name: string
  doing_business_as: string
  business_type: string
  industry: string
  registration_number: string
  tax_id: string
  trn: string
  gct_number: string
  nis_number: string
  incorporation_date: string
  address_line1: string
  address_line2: string
  city: string
  region_id: string
  country_code: string
  primary_phone: string
  primary_email: string
  fax: string
  website_url: string
  currency_code: string
  timezone: string
  language: string
}

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: 'sole_proprietorship', label: 'Sole proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'non_profit', label: 'Non-profit' },
  { value: 'other', label: 'Other' },
]

/** ISO 4217 currencies, Caribbean-first for the platform's primary market. */
const CURRENCIES: { value: string; label: string }[] = [
  { value: 'JMD', label: 'JMD — Jamaican Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'TTD', label: 'TTD — Trinidad & Tobago Dollar' },
  { value: 'BBD', label: 'BBD — Barbadian Dollar' },
  { value: 'BSD', label: 'BSD — Bahamian Dollar' },
  { value: 'XCD', label: 'XCD — East Caribbean Dollar' },
  { value: 'KYD', label: 'KYD — Cayman Islands Dollar' },
  { value: 'GYD', label: 'GYD — Guyanese Dollar' },
  { value: 'BZD', label: 'BZD — Belize Dollar' },
  { value: 'HTG', label: 'HTG — Haitian Gourde' },
  { value: 'DOP', label: 'DOP — Dominican Peso' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'GBP', label: 'GBP — Pound Sterling' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'MXN', label: 'MXN — Mexican Peso' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

type FieldKey = keyof ProfileFormValues

/** A Zoho-style row: label on the left, control on the right. */
function FieldRow({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-2.5 sm:grid-cols-[minmax(160px,200px)_minmax(0,1fr)] sm:items-start sm:gap-6">
      <Label htmlFor={htmlFor} className="sm:pt-2">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="max-w-md">
        {children}
        {hint ? (
          <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

type InputRowProps = {
  id: FieldKey
  label: string
  value: string
  disabled: boolean
  onChange: (key: FieldKey, value: string) => void
  type?: string
  placeholder?: string
  hint?: string
  required?: boolean
  maxLength?: number
  uppercase?: boolean
}

/** Module-level so it is not re-created (and remounted) on every render. */
function InputRow({
  id,
  label,
  value,
  disabled,
  onChange,
  type = 'text',
  placeholder,
  hint,
  required,
  maxLength,
  uppercase,
}: InputRowProps) {
  return (
    <FieldRow label={label} htmlFor={id} required={required} hint={hint}>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full"
        onChange={(event) =>
          onChange(
            id,
            uppercase ? event.target.value.toUpperCase() : event.target.value
          )
        }
      />
    </FieldRow>
  )
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="text-muted-foreground pt-8 pb-1 text-xs font-medium tracking-wide uppercase first:pt-0">
      {children}
    </h2>
  )
}

/** Trims a value and maps an empty string to `null` (clears the field). */
function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

type Props = {
  orgSlug: string
  canEdit: boolean
  initial: ProfileFormValues
  /** Parish options ({ value: region_id, label: name }) for the address block. */
  parishes: { value: string; label: string }[]
}

export function ProfileForm({ orgSlug, canEdit, initial, parishes }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<ProfileFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const disabled = !canEdit || saving

  function setField(key: FieldKey, value: string) {
    setSaved(false)
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit) return

    setSaving(true)
    setError(null)
    setSaved(false)

    const result = await request<{ id: string }>(
      '/api/manage/settings/orgprofile',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          name: values.name.trim(),
          short_name: toNullable(values.short_name),
          doing_business_as: toNullable(values.doing_business_as),
          business_type: toNullable(values.business_type),
          industry: toNullable(values.industry),
          registration_number: toNullable(values.registration_number),
          tax_id: toNullable(values.tax_id),
          trn: toNullable(values.trn),
          gct_number: toNullable(values.gct_number),
          nis_number: toNullable(values.nis_number),
          incorporation_date: toNullable(values.incorporation_date),
          address_line1: toNullable(values.address_line1),
          address_line2: toNullable(values.address_line2),
          city: toNullable(values.city),
          region_id: toNullable(values.region_id),
          country_code: toNullable(values.country_code),
          primary_phone: toNullable(values.primary_phone),
          primary_email: toNullable(values.primary_email),
          fax: toNullable(values.fax),
          website_url: toNullable(values.website_url),
          currency_code: toNullable(values.currency_code),
          timezone: toNullable(values.timezone),
          language: toNullable(values.language),
        }),
      }
    )

    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="flex flex-col">
        <SectionHeading>Organization</SectionHeading>

        <FieldRow label="Organization logo">
          <div className="flex items-center gap-4">
            <div className="border-input text-muted-foreground flex size-20 items-center justify-center rounded-md border border-dashed">
              <BuildingOffice2Icon className="size-6" />
            </div>
            <p className="text-muted-foreground text-xs">
              Logo upload is coming soon.
            </p>
          </div>
        </FieldRow>

        <InputRow
          id="name"
          label="Organization name"
          value={values.name}
          disabled={disabled}
          onChange={setField}
          required
        />
        <InputRow
          id="doing_business_as"
          label="Trading name (DBA)"
          value={values.doing_business_as}
          disabled={disabled}
          onChange={setField}
          hint="If different from the registered name."
        />
        <FieldRow label="Business type" htmlFor="business_type">
          <NativeSelect
            id="business_type"
            name="business_type"
            value={values.business_type}
            disabled={disabled}
            onChange={(event) => setField('business_type', event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Select…</NativeSelectOption>
            {BUSINESS_TYPES.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldRow>
        <InputRow
          id="industry"
          label="Industry"
          value={values.industry}
          disabled={disabled}
          onChange={setField}
          placeholder="e.g. Logistics and delivery"
        />

        <FieldRow label="Organization address">
          <div className="flex flex-col gap-2">
            <Input
              id="address_line1"
              name="address_line1"
              value={values.address_line1}
              disabled={disabled}
              placeholder="Street address"
              className="w-full"
              onChange={(event) =>
                setField('address_line1', event.target.value)
              }
            />
            <Input
              id="address_line2"
              name="address_line2"
              value={values.address_line2}
              disabled={disabled}
              placeholder="Apartment, suite, unit, etc."
              className="w-full"
              onChange={(event) =>
                setField('address_line2', event.target.value)
              }
            />
            <Input
              id="city"
              name="city"
              value={values.city}
              disabled={disabled}
              placeholder="City / town"
              className="w-full"
              onChange={(event) => setField('city', event.target.value)}
            />
            <NativeSelect
              id="region_id"
              name="region_id"
              value={values.region_id}
              disabled={disabled || parishes.length === 0}
              onChange={(event) => setField('region_id', event.target.value)}
              className="w-full"
            >
              <NativeSelectOption value="">Select parish…</NativeSelectOption>
              {parishes.map((parish) => (
                <NativeSelectOption key={parish.value} value={parish.value}>
                  {parish.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              id="country_code"
              name="country_code"
              value={values.country_code}
              disabled={disabled}
              placeholder="Country (2-letter ISO, e.g. JM)"
              maxLength={2}
              className="w-full"
              onChange={(event) =>
                setField('country_code', event.target.value.toUpperCase())
              }
            />
          </div>
        </FieldRow>

        <SectionHeading>Contact</SectionHeading>
        <InputRow
          id="primary_phone"
          label="Phone"
          value={values.primary_phone}
          disabled={disabled}
          onChange={setField}
          type="tel"
        />
        <InputRow
          id="primary_email"
          label="Email"
          value={values.primary_email}
          disabled={disabled}
          onChange={setField}
          type="email"
        />
        <InputRow
          id="fax"
          label="Fax"
          value={values.fax}
          disabled={disabled}
          onChange={setField}
        />
        <InputRow
          id="website_url"
          label="Website"
          value={values.website_url}
          disabled={disabled}
          onChange={setField}
          type="url"
          placeholder="https://"
        />

        <SectionHeading>Registration &amp; tax</SectionHeading>
        <InputRow
          id="registration_number"
          label="Company registration number"
          value={values.registration_number}
          disabled={disabled}
          onChange={setField}
        />
        <InputRow
          id="incorporation_date"
          label="Incorporation date"
          value={values.incorporation_date}
          disabled={disabled}
          onChange={setField}
          type="date"
        />
        <InputRow
          id="trn"
          label="TRN"
          value={values.trn}
          disabled={disabled}
          onChange={setField}
          hint="Taxpayer Registration Number (Jamaica)."
        />
        <InputRow
          id="gct_number"
          label="GCT number"
          value={values.gct_number}
          disabled={disabled}
          onChange={setField}
        />
        <InputRow
          id="nis_number"
          label="NIS number"
          value={values.nis_number}
          disabled={disabled}
          onChange={setField}
        />
        <InputRow
          id="tax_id"
          label="Tax ID"
          value={values.tax_id}
          disabled={disabled}
          onChange={setField}
          hint="For organizations outside Jamaica."
        />

        <SectionHeading>Locale</SectionHeading>
        <FieldRow
          label="Base currency"
          htmlFor="currency_code"
          hint="Default currency for invoices and financial reports."
        >
          <NativeSelect
            id="currency_code"
            name="currency_code"
            value={values.currency_code}
            disabled={disabled}
            onChange={(event) => setField('currency_code', event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Select…</NativeSelectOption>
            {CURRENCIES.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FieldRow>
        <InputRow
          id="timezone"
          label="Time zone"
          value={values.timezone}
          disabled={disabled}
          onChange={setField}
          placeholder="America/Jamaica"
        />
        <InputRow
          id="language"
          label="Language"
          value={values.language}
          disabled={disabled}
          onChange={setField}
          placeholder="en-JM"
        />
      </div>

      {error ? (
        <p className="text-destructive mt-6 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-8 flex items-center gap-3 border-t pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => router.push(`/org/${orgSlug}/settings`)}
          >
            Cancel
          </Button>
          {saved ? (
            <span className="text-muted-foreground text-sm">Saved.</span>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground mt-8 border-t pt-6 text-sm">
          Only organization owners and admins can edit these details.
        </p>
      )}
    </form>
  )
}
