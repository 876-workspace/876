import type { Branding } from '@876/core/branding'
import { invoiceSeller } from '@876/billing-ui/document/invoice-document-data'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { getPlatformClient } from '@/lib/services/platform'
import { service } from '@/lib/service'

import { BrandingForm } from './_components/branding-form'

export const metadata = { title: 'Branding' }

export default async function BrandingPage() {
  const context = await requirePagePermission('sales:read')
  const platform = await getPlatformClient()
  const [stored, organization] = await Promise.all([
    service.branding.retrieve(context.tenant.id),
    platform.organizations.retrieve({ id: context.orgId }),
  ])
  const canManage = context.permissions.includes('sales:write')

  // Billing has no organization-profile settings page, so the logo itself is
  // managed wherever the organization row is edited; only the URL is shown.
  const seller = organization.data
    ? invoiceSeller(organization.data, context.tenant.name)
    : null
  const initial: Branding = {
    accentColor: stored.accentColor,
    appearance: stored.appearance,
    sidebarTone: stored.sidebarTone,
  }

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title">Branding</h1>
      <div className="mt-6">
        {canManage ? (
          <BrandingForm
            initial={initial}
            logoUrl={seller?.logoUrl ?? null}
            logoHref={null}
          />
        ) : (
          <p className="876-card text-muted-foreground p-5 text-sm">
            Branding is managed by workspace members with sales permission.
          </p>
        )}
      </div>
    </Page>
  )
}
