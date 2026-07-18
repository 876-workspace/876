'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

import { client } from '@/lib/client'
import { generateOrgSlug } from '@/lib/slug'

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
]

// Common ISO 3166-1 alpha-2 country codes
const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'JM', label: 'Jamaica' },
  { code: 'TT', label: 'Trinidad and Tobago' },
  { code: 'BB', label: 'Barbados' },
  { code: 'GY', label: 'Guyana' },
  { code: 'BS', label: 'Bahamas' },
  { code: 'BZ', label: 'Belize' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'SE', label: 'Sweden' },
  { code: 'NO', label: 'Norway' },
  { code: 'DK', label: 'Denmark' },
  { code: 'FI', label: 'Finland' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'IE', label: 'Ireland' },
  { code: 'SG', label: 'Singapore' },
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japan' },
  { code: 'CN', label: 'China' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'KE', label: 'Kenya' },
  { code: 'GH', label: 'Ghana' },
]

// Common ISO 4217 currency codes
const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'JMD', label: 'JMD — Jamaican Dollar' },
  { code: 'TTD', label: 'TTD — Trinidad & Tobago Dollar' },
  { code: 'BBD', label: 'BBD — Barbadian Dollar' },
  { code: 'GYD', label: 'GYD — Guyanese Dollar' },
  { code: 'BSD', label: 'BSD — Bahamian Dollar' },
  { code: 'BZD', label: 'BZD — Belize Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
]

const selectClass =
  'border-input bg-background text-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none'

export function CreateOrgForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Identity
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [status, setStatus] = useState('active')

  // Contact
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [supportUrl, setSupportUrl] = useState('')

  // Address
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')

  // Localization
  const [countryCode, setCountryCode] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(generateOrgSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(generateOrgSlug(value))
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('Organization name is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const { data, error } = await client.orgs.create({
        name: name.trim(),
        short_name: shortName.trim() || null,
        slug: slug.trim() || null,
        status,
        primary_phone: primaryPhone.trim() || null,
        primary_email: primaryEmail.trim() || null,
        website_url: websiteUrl.trim() || null,
        support_url: supportUrl.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        country_code: countryCode || null,
        currency_code: currencyCode || null,
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to create organization.')
      } else {
        router.push(`/orgs/${data.slug}`)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Identity */}
      <section>
        <h2 className="876-section-title mb-4">Identity</h2>
        <div className="876-card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="name"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="short_name"
              >
                Short name{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                id="short_name"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Acme"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="slug">
              Slug
              <span className="text-muted-foreground ml-1 font-normal">
                (auto-generated if blank)
              </span>
            </label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme-corp"
              spellCheck={false}
              className="font-mono"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Lowercase letters, numbers, hyphens only.
            </p>
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="status"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="876-section-title mb-4">Contact</h2>
        <div className="876-card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="primary_phone"
              >
                Phone
              </label>
              <Input
                id="primary_phone"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="+1 876 000 0000"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="primary_email"
              >
                Email
              </label>
              <Input
                id="primary_email"
                type="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="website_url"
            >
              Website
            </label>
            <Input
              id="website_url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="support_url"
            >
              Support URL
            </label>
            <Input
              id="support_url"
              type="url"
              value={supportUrl}
              onChange={(e) => setSupportUrl(e.target.value)}
              placeholder="https://support.example.com"
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section>
        <h2 className="876-section-title mb-4">Address</h2>
        <div className="876-card space-y-4 p-5">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="address_line1"
            >
              Address line 1
            </label>
            <Input
              id="address_line1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="address_line2"
            >
              Address line 2
            </label>
            <Input
              id="address_line2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite 400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="city">
              City
            </label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Kingston"
            />
          </div>
        </div>
      </section>

      {/* Localization */}
      <section>
        <h2 className="876-section-title mb-4">Localization</h2>
        <div className="876-card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="country_code"
              >
                Country
              </label>
              <select
                id="country_code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={selectClass}
              >
                <option value="">— Select country —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="currency_code"
              >
                Currency
              </label>
              <select
                id="currency_code"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className={selectClass}
              >
                <option value="">— Select currency —</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button variant="info" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Organization'}
        </Button>
        {error && <span className="text-destructive text-sm">{error}</span>}
      </div>
    </div>
  )
}
