'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Home } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import type { ReactNode } from 'react'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import { generateOrgSlug } from '@/lib/slug'
import type { AdminOrganization } from '@876/admin'

const STATUSES = ['active', 'suspended', 'pending']

type Props = { org: AdminOrganization }

/** Titled `876-surface` card matching the user overview cards. */
function FormCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: IconComponent
  children: ReactNode
}) {
  return (
    <section className="876-card p-5">
      <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
        <span className="bg-876-accent-surface text-876-accent-fg flex size-6 shrink-0 items-center justify-center rounded-md">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  optional,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="text-muted-foreground ml-1 font-normal">
            (optional)
          </span>
        )}
      </Label>
      {children}
    </div>
  )
}

export function EditOrgForm({ org }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(org.name ?? '')
  const [shortName, setShortName] = useState(org.short_name ?? '')
  const [slug, setSlug] = useState(org.slug)
  const [slugTouched, setSlugTouched] = useState(false)
  const [status, setStatus] = useState(org.status)
  const [phone, setPhone] = useState(org.primary_phone ?? '')
  const [email, setEmail] = useState(org.primary_email ?? '')
  const [website, setWebsite] = useState(org.website_url ?? '')
  const [supportUrl, setSupportUrl] = useState(org.support_url ?? '')
  const [addressLine1, setAddressLine1] = useState(org.address_line1 ?? '')
  const [addressLine2, setAddressLine2] = useState(org.address_line2 ?? '')
  const [city, setCity] = useState(org.city ?? '')
  const [countryCode, setCountryCode] = useState(org.country_code ?? '')
  const [currencyCode, setCurrencyCode] = useState(org.currency_code ?? '')

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(generateOrgSlug(value))
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const { data, error } = await client.orgs.update(org.id, {
        name: name.trim() || null,
        short_name: shortName.trim() || null,
        slug: slug.trim() || undefined,
        status,
        primary_phone: phone.trim() || null,
        primary_email: email.trim() || null,
        website_url: website.trim() || null,
        support_url: supportUrl.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        country_code: countryCode.trim() || null,
        currency_code: currencyCode.trim() || null,
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to update organization.')
        return
      }
      // Slug may have changed — navigate to the updated org URL.
      router.push(`/orgs/${data.slug}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <FormCard title="Identity" icon={Building2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="eo_name" label="Name" optional>
            <Input
              id="eo_name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
            />
          </Field>
          <Field id="eo_short_name" label="Short name" optional>
            <Input
              id="eo_short_name"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="Acme"
            />
          </Field>
          <Field id="eo_slug" label="Slug">
            <Input
              id="eo_slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme-corp"
              spellCheck={false}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Changing the slug updates the organization URL.
            </p>
          </Field>
          <Field id="eo_status" label="Status">
            <NativeSelect
              id="eo_status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full capitalize"
            >
              {STATUSES.map((s) => (
                <NativeSelectOption key={s} value={s} className="capitalize">
                  {s}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </FormCard>

      <FormCard title="Contact" icon={Mail}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="eo_phone" label="Phone">
            <Input
              id="eo_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 876 000 0000"
            />
          </Field>
          <Field id="eo_email" label="Email">
            <Input
              id="eo_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </Field>
          <Field id="eo_website" label="Website">
            <Input
              id="eo_website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </Field>
          <Field id="eo_support_url" label="Support URL">
            <Input
              id="eo_support_url"
              type="url"
              value={supportUrl}
              onChange={(e) => setSupportUrl(e.target.value)}
              placeholder="https://support.example.com"
            />
          </Field>
        </div>
      </FormCard>

      <FormCard title="Address" icon={Home}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="eo_addr1" label="Address line 1">
            <Input
              id="eo_addr1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main St"
            />
          </Field>
          <Field id="eo_addr2" label="Address line 2">
            <Input
              id="eo_addr2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite 100"
            />
          </Field>
          <Field id="eo_city" label="City">
            <Input
              id="eo_city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Kingston"
            />
          </Field>
          <Field id="eo_country" label="Country code">
            <Input
              id="eo_country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="JM"
              maxLength={2}
              className="font-mono uppercase"
            />
          </Field>
          <Field id="eo_currency" label="Currency code">
            <Input
              id="eo_currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              placeholder="JMD"
              maxLength={3}
              className="font-mono uppercase"
            />
          </Field>
        </div>
      </FormCard>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/orgs/${org.slug}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Cancel
        </Link>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
