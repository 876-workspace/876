import { Suspense } from 'react'

import { DomainListPanelSkeleton } from '@876/communications-ui/panels/domain-list-panel'
import { DomainRecordsPanelSkeleton } from '@876/communications-ui/panels/domain-records-panel'
import { SenderListPanelSkeleton } from '@876/communications-ui/panels/sender-list-panel'
import { TemplateListPanelSkeleton } from '@876/communications-ui/panels/template-list-panel'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import {
  canManageBilling,
  requirePagePermission,
} from '@/lib/auth/billing-context'

import { DomainsData } from './_components/domains-data'
import { DomainRecordsData } from './_components/domain-records-data'
import { EmailDomainAddForm } from './_components/email-domain-add-form'
import { SendersData } from './_components/senders-data'
import { TemplatesData } from './_components/templates-data'

export const metadata = { title: 'Email settings - Settings' }

const BASE_HREF = '/settings/email'

export default async function EmailSettingsPage() {
  const context = await requirePagePermission('settings:read')
  const canManage = canManageBilling(context.role)

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar title="Email settings" refresh />
      <div className="mt-6 space-y-8">
        {canManage ? <EmailDomainAddForm /> : null}
        <Suspense fallback={<SenderListPanelSkeleton />}>
          <SendersData organizationId={context.orgId} baseHref={BASE_HREF} />
        </Suspense>
        <Suspense fallback={<DomainListPanelSkeleton />}>
          <DomainsData
            organizationId={context.orgId}
            baseHref={BASE_HREF}
            canManage={canManage}
          />
        </Suspense>
        <Suspense
          fallback={
            <DomainRecordsPanelSkeleton domainName="Sending domain" />
          }
        >
          <DomainRecordsData
            organizationId={context.orgId}
            baseHref={BASE_HREF}
          />
        </Suspense>
        <Suspense fallback={<TemplateListPanelSkeleton />}>
          <TemplatesData organizationId={context.orgId} baseHref={BASE_HREF} />
        </Suspense>
      </div>
    </Page>
  )
}
