'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'

import { request } from '@/lib/client/request'
import { OrganizationLogoUpload } from './organization-logo-upload'
import type { FieldKey, SectionSpec } from '../_lib/field-spec'
import type { SectionsProps } from './field-controls'
import { ProfileSections } from './profile-sections'

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

/** Trims a value and maps an empty string to `null` (clears the field). */
function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

type Props = {
  orgSlug: string
  canEdit: boolean
  logoUrl: string | null
  logoUploadEnabled: boolean
  initial: ProfileFormValues
  /** The section/field model, built on the server so the nav can share it. */
  sections: SectionSpec[]
}

export function ProfileForm({
  orgSlug,
  canEdit,
  logoUrl,
  logoUploadEnabled,
  initial,
  sections,
}: Props) {
  const router = useRouter()
  const [values, setValues] = useState<ProfileFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = (Object.keys(initial) as FieldKey[]).some(
    (key) => values[key] !== initial[key]
  )

  const disabled = !canEdit || saving

  const setField = useCallback((key: FieldKey, value: string) => {
    setSaved(false)
    setValues((current) => ({ ...current, [key]: value }))
  }, [])

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

  const logo = (
    <OrganizationLogoUpload
      orgSlug={orgSlug}
      orgName={values.name}
      logoUrl={logoUrl}
      canEdit={canEdit}
      featureEnabled={logoUploadEnabled}
    />
  )

  const sectionsProps: SectionsProps = {
    sections,
    values,
    disabled,
    onChange: setField,
    logo,
  }

  return (
    <form onSubmit={handleSubmit}>
      <ProfileSections {...sectionsProps} />

      {error ? (
        <p className="text-destructive mt-6 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <div className="bg-876-surface/92 border-border-strong sticky bottom-0 -mx-4 mt-6 flex items-center gap-3 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <p
            className="text-muted-foreground mr-auto flex items-center gap-2 text-sm"
            aria-live="polite"
          >
            {dirty ? (
              <>
                <span className="bg-primary size-1.5 rounded-full" />
                Unsaved changes
              </>
            ) : saved ? (
              'All changes saved'
            ) : null}
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => setValues(initial)}
          >
            Discard
          </Button>
          <Button
            type="submit"
            disabled={saving || !dirty}
            className="bg-876-blue text-white hover:bg-[color-mix(in_oklab,var(--876-blue)_82%,black)]"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-8 border-t pt-6 text-sm">
          Only organization owners and admins can edit these details.
        </p>
      )}
    </form>
  )
}
