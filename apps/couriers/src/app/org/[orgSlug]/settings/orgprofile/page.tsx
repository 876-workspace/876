import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { ProfileForm, type ProfileFormValues } from './profile-form'

export const metadata = { title: 'Organization profile — Settings' }

/** Coerces a nullable API string into a controlled-input value. */
function str(value: string | null | undefined): string {
  return value ?? ''
}

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx) notFound()

  const platform = await getPlatformClient()
  const [result, regionsResult] = await Promise.all([
    platform.orgs.retrieveProfile(ctx.orgId),
    platform.geo.listRegions('JM'),
  ])

  if (result.error)
    return (
      <Page>
        <PageBreadcrumb
          href={`/org/${orgSlug}/settings`}
          label="Settings"
          className="mb-4"
        />

        <PageHeader className="mb-8">
          <PageTitle>Organization profile</PageTitle>
        </PageHeader>

        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load your organization profile. Please try again.
        </div>
      </Page>
    )

  const profile = result.data
  const initial: ProfileFormValues = {
    name: str(profile.name),
    short_name: str(profile.short_name),
    doing_business_as: str(profile.doing_business_as),
    business_type: str(profile.business_type),
    industry: str(profile.industry),
    registration_number: str(profile.registration_number),
    tax_id: str(profile.tax_id),
    trn: str(profile.trn),
    gct_number: str(profile.gct_number),
    nis_number: str(profile.nis_number),
    incorporation_date: str(profile.incorporation_date),
    address_line1: str(profile.address_line1),
    address_line2: str(profile.address_line2),
    city: str(profile.city),
    region_id: str(profile.region_id),
    country_code: str(profile.country_code),
    primary_phone: str(profile.primary_phone),
    primary_email: str(profile.primary_email),
    fax: str(profile.fax),
    website_url: str(profile.website_url),
    currency_code: str(profile.currency_code),
    timezone: str(profile.timezone),
    language: str(profile.language),
  }

  const canEdit = ctx.role === 'owner' || ctx.role === 'admin'
  const parishes = (regionsResult.data ?? [])
    .map((region) => ({ value: region.id, label: region.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>Organization profile</PageTitle>
      </PageHeader>

      <ProfileForm
        orgSlug={orgSlug}
        canEdit={canEdit}
        initial={initial}
        parishes={parishes}
      />
    </Page>
  )
}
