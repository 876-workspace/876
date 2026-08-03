import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { getFeatures } from '@/lib/features'
import { buildSections } from './_lib/field-spec'
import { ProfileForm, type ProfileFormValues } from './_components/profile-form'

export const metadata = { title: 'Organization profile — Settings' }

/** Coerces a nullable API string into a controlled-input value. */
function str(value: string | null | undefined): string {
  return value ?? ''
}

type Props = { params: Promise<{ orgSlug: string }> }

export default function ProfileSettingsPage({ params }: Props) {
  return (
    <Page>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileSettingsData params={params} />
      </Suspense>
    </Page>
  )
}

async function ProfileSettingsData({ params }: Props) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx) notFound()

  const platform = await getPlatformClient()
  const [result, regionsResult, features] = await Promise.all([
    platform.organizations.retrieveProfile(ctx.orgId),
    platform.regions.list('JM'),
    getFeatures({ userId: ctx.userId, organizationId: ctx.orgId }),
  ])

  if (result.error)
    return (
      <>
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
      </>
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

  const sections = buildSections(parishes)

  return (
    <>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-6">
        <PageTitle>Organization profile</PageTitle>
      </PageHeader>

      <ProfileForm
        orgSlug={orgSlug}
        canEdit={canEdit}
        logoUrl={profile.logo_url}
        logoUploadEnabled={features.storageOrgLogoUpload}
        initial={initial}
        sections={sections}
      />
    </>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-16" />
      <PageHeader className="mb-6">
        <PageTitle>Organization profile</PageTitle>
      </PageHeader>
      <div className="space-y-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="876-card space-y-4 p-5">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
