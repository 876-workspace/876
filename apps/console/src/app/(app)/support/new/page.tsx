import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/features/support/components/platform-organization-unavailable'
import { RequestCreateForm } from '@/features/support/components/request-create-form'
import { requireSession } from '@/lib/auth/guards'
import { getPlatformOrganization } from '@/lib/platform-org'

export default function NewSupportRequestPage() {
  return (
    <Page>
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

  return (
    <RequestCreateForm
      organizationId={org.id}
      requestsHref="/support"
      currentUserId={session.id}
    />
  )
}

function RequestCreateFormFallback() {
  return (
    <div className="876-card max-w-3xl space-y-5 p-5">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  )
}
