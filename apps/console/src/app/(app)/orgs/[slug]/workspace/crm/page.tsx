import { AppError } from '@876/ui/app-error'
import { ClipboardList, Clock, Users } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { StatTile } from '@/components/patterns/detail/stat-tile'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { RequestsList } from '@/features/crm/components/requests-list'
import { loadRequestRowContext } from '@/features/crm/request-data'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { crm } from '@/lib/services/crm'

import { resolveOrg } from '../../_data'

type Props = { params: Promise<{ slug: string }> }

const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'WAITING'])
const RECENT_LIMIT = 5

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'CRM' }

  return { title: `${org.name ?? org.slug} • CRM - Organizations` }
}

export default async function CrmWorkspaceOverviewPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="space-y-5">
      <h1 className="876-page-title">Overview</h1>
      <Suspense fallback={<OverviewFallback />}>
        <OverviewData slug={slug} />
      </Suspense>
    </div>
  )
}

async function OverviewData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [requestsResult, customersResult] = await Promise.all([
    crm.requests.list(org.id),
    crm.customerProfiles.list(org.id),
  ])

  if (
    requestsResult.error?.code === 'crm/tenant-not-found' ||
    customersResult.error?.code === 'crm/tenant-not-found'
  )
    return <NoCrmWorkspace />

  const base = workspaceBase(slug, 'crm')
  const requests = requestsResult.data?.data ?? []
  const openCount = requests.filter((request) =>
    OPEN_STATUSES.has(request.status)
  ).length
  const recent = requests
    .toSorted((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT_LIMIT)

  return (
    <div className="space-y-5">
      {requestsResult.error ? (
        <AppError
          title="Request data is temporarily unavailable"
          error={requestsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      {customersResult.error ? (
        <AppError
          title="Customer data is temporarily unavailable"
          error={customersResult.error}
          variant="banner"
          showCode
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={Clock}
          label="Open requests"
          value={requestsResult.error ? '—' : openCount}
        />
        <StatTile
          icon={ClipboardList}
          label="Total requests"
          value={
            requestsResult.error
              ? '—'
              : (requestsResult.data?.total_count ?? requests.length)
          }
        />
        <StatTile
          icon={Users}
          label="Customers"
          value={
            customersResult.error
              ? '—'
              : (customersResult.data?.total_count ??
                customersResult.data?.data.length ??
                0)
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[0.9375rem] font-semibold">Recent requests</h2>
          <Link
            href={`${base}/requests`}
            className="text-876-accent-fg text-[0.8125rem] font-medium hover:underline"
          >
            View all
          </Link>
        </div>
        {requestsResult.error ? null : (
          <RequestsList
            requestsHref={`${base}/requests`}
            requests={toRequestListRows({
              requests: recent,
              ...(await loadRequestRowContext(org.id)),
            })}
          />
        )}
      </div>
    </div>
  )
}

function OverviewFallback() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[4.25rem] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
