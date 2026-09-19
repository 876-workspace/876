import { redirect } from 'next/navigation'

import type { Branding } from '@876/core/branding'
import { invoiceSeller } from '@876/billing-ui/document/invoice-document-data'
import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { getInvoiceContext } from '@/lib/auth/context'
import { canAccess } from '@/lib/auth/access-context'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/clients/billing'
import { getPlatformClient } from '@/lib/clients/platform'

import { BrandingForm } from './_components/branding-form'

export const metadata = { title: 'Branding' }

export default async function BrandingPage() {
  const access = await requireAppPermission('settings.view')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const [billing, platform] = await Promise.all([
    getBilling(context.orgId),
    getPlatformClient(),
  ])
  const [stored, organization] = await Promise.all([
    billing.branding.retrieve(),
    platform.organizations.retrieve({ id: context.orgId }),
  ])
  const canManage = canAccess(access, 'settings.edit')

  if (stored.error || !stored.data) {
    return (
      <Page>
        <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
        <h1 className="876-page-title">Branding</h1>
        <div className="mt-6">
          <AppError
            title="Branding could not be loaded"
            error={
              stored.error ?? {
                code: 'branding/load-failed',
                message: 'Branding could not be loaded. Try again.',
              }
            }
            variant="section"
          />
        </div>
      </Page>
    )
  }

  // Invoice has no organization-profile settings page, so the logo itself is
  // managed wherever the organization row is edited; only the URL is shown.
  const seller = organization.data
    ? invoiceSeller(organization.data, context.orgName)
    : null
  const initial: Branding = {
    accentColor: stored.data.accentColor,
    appearance: stored.data.appearance,
    sidebarTone: stored.data.sidebarTone,
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
