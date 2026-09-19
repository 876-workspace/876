import { notFound } from 'next/navigation'

import type { Branding } from '@876/core/branding'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'
import { createBillingIntegration } from '@/lib/clients/billing'
import { getPlatformClient } from '@/lib/clients/platform'

import { BrandingForm } from './_components/branding-form'

export const metadata = { title: 'Branding' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function BrandingSettingsPage({ params }: Props) {
  const { orgSlug } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()

  const canManage = context.role === 'super-admin' || context.role === 'admin'

  const billing = createBillingIntegration()
  const platform = await getPlatformClient()
  const [stored, profile] = await Promise.all([
    billing.branding.retrieve(context.orgId),
    platform.organizations.retrieveProfile(context.orgId),
  ])

  if (stored.error || !stored.data) {
    return (
      <Page>
        <PageHeader className="mb-4">
          <PageTitle>Branding</PageTitle>
        </PageHeader>
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load your branding settings. Please try again.
        </div>
      </Page>
    )
  }

  const initial: Branding = {
    accentColor: stored.data.accentColor,
    appearance: stored.data.appearance,
    sidebarTone: stored.data.sidebarTone,
  }

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Branding</PageTitle>
      </PageHeader>
      <div className="mt-6">
        {canManage ? (
          <BrandingForm
            orgSlug={orgSlug}
            initial={initial}
            logoUrl={profile.data?.logo_url ?? null}
            logoHref={`/${orgSlug}/settings/orgprofile`}
          />
        ) : (
          <p className="876-card text-muted-foreground p-5 text-sm">
            Branding is managed by organization admins.
          </p>
        )}
      </div>
    </Page>
  )
}
