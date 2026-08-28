import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/features/crm/components/platform-organization-unavailable'
import { RequestCreateForm } from '@/features/crm/components/request-create-form'
import { loadOrgRequestCustomers } from '@/features/crm/request-data'
import { requireSession } from '@/lib/auth/guards'
import { getPlatformOrganization } from '@/lib/platform-org'

export default function NewSupportRequestPage() {
  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <div className="space-y-5">
        <div>
          <PageBreadcrumb href="/support" label="Requests" className="mb-2" />
          <h1 className="876-page-title mt-2">New request</h1>
        </div>
        <Suspense fallback={<RequestCreateFormFallback />}>
          <RequestCreateFormData />
        </Suspense>
      </div>
    </Page>
  )
}

async function RequestCreateFormData() {
  const [org, session] = await Promise.all([
    getPlatformOrganization(),
    requireSession('/support/new'),
  ])
  if (!org) return <PlatformOrganizationUnavailable />
  const customers = await loadOrgRequestCustomers(org.id)

  return (
    <RequestCreateForm
      organizationId={org.id}
      requestsHref="/support"
      currentUserId={session.id}
      customers={customers}
    />
  )
}

function RequestCreateFormFallback() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="876-card overflow-hidden">
        <div className="border-b px-5 py-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-5 p-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton
                className={index === 1 ? 'h-48 w-full' : 'h-9 w-full'}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
      <div className="876-card space-y-4 p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  )
}
