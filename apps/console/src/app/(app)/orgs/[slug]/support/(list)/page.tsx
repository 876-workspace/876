import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
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
import { resolveOrg, resolveOrgCustomerWithUs } from '../../_data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)

  return { title: `${org?.name ?? slug} • Requests - Organizations` }
}

/**
 * Support requests this organization has raised **with 876**.
 *
 * The counterpart to `/orgs/[slug]/workspace/crm`, and the distinction is the
 * whole point: this reads *our* CRM tenant filtered to the customer record that
 * represents this organization, while the workspace reads the organization's
 * own tenant. Same product, opposite direction.
 */
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
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const platformOrg = await getPlatformOrganization()
  if (!platformOrg) return <NoCrmWorkspace />

  const customer = await resolveOrgCustomerWithUs(org.id)
  // No customer record means this organization has never been in contact — a
  // state, not a failure, and a normal one for a brand-new organization.
  if (!customer) return <NoSupportHistory />

  const result = await $876.requests.list(platformOrg.id, {
    customerId: customer.profile.id,
    status: status === 'all' ? undefined : status,
  })
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />
  if (result.error) throw new Error(result.error.message)

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
