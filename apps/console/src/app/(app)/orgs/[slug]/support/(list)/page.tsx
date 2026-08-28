import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ChatBubbleLeftIcon } from '@876/ui/icons'

import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import {
  RequestsList,
  RequestsListSkeleton,
} from '@/features/crm/components/requests-list'
import { loadRequestRowContext } from '@/features/crm/request-data'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'
import { $876 } from '@/lib/876'
import { getPlatformOrganization } from '@/lib/platform-org'
import type { CrmRequestStatus } from '@/types/crm'
import {
  resolveOrg,
  resolveOrgCustomerWithUs,
  resolveOrgResult,
} from '../../_data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)

  return { title: `${org?.name ?? slug} • Requests - Organizations` }
}

export default async function OrganizationSupportPage({
  params,
  searchParams,
}: Props) {
  const { status } = await searchParams
  const selectedStatus = isRequestStatus(status) ? status : 'all'

  return (
    <>
      <ResourceToolbar
        title="Requests"
        titleFilter={
          <StatusFilterHeading
            label="Requests"
            value={selectedStatus}
            options={REQUEST_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense fallback={<RequestsListSkeleton />}>
        <SupportRequestsData params={params} status={selectedStatus} />
      </Suspense>
    </>
  )
}

async function SupportRequestsData({
  params,
  status,
}: {
  params: Promise<{ slug: string }>
  status: CrmRequestStatus | 'all'
}) {
  const { slug } = await params
  const orgResult = await resolveOrgResult(slug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization details are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const platformOrg = await getPlatformOrganization()
  if (!platformOrg) return <NoCrmWorkspace />

  const customerResult = await resolveOrgCustomerWithUs(orgResult.data.id)
  if (customerResult.error)
    return (
      <AppError
        title="Support customer record is temporarily unavailable"
        error={customerResult.error}
        variant="banner"
        showCode
      />
    )
  if (!customerResult.data) return <NoSupportHistory />

  const result = await $876.requests.list(platformOrg.id, {
    customerId: customerResult.data.profile.id,
    status: status === 'all' ? undefined : status,
  })
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />
  if (result.error)
    return (
      <AppError
        title="Support requests are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  const context = await loadRequestRowContext(platformOrg.id)

  return (
    <RequestsList
      requestsHref={`/orgs/${slug}/support`}
      requests={toRequestListRows({ requests: result.data.data, ...context })}
    />
  )
}

function NoSupportHistory() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChatBubbleLeftIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No support history</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
