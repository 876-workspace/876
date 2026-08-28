import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ClipboardList, Clock, Users } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { StatTile } from '@/components/patterns/detail/stat-tile'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { RequestsTable } from '@/features/crm/components/requests-table'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '../../_data'

type Props = { params: Promise<{ slug: string }> }

/** Statuses that mean the organization still owes someone an answer. */
const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'WAITING'])

/** How many of the most recent requests the landing view shows. */
const RECENT_LIMIT = 5

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'CRM' }

  return { title: `${org.name ?? org.slug} • CRM - Organizations` }
}

/**
 * The CRM workspace landing view.
 *
 * The point of landing somewhere rather than on a list is orientation: an
 * operator opening an organization's CRM usually wants to know how much is
 * outstanding before they want to read any single record.
 */
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

  // Two independent reads, started together. Both lists are also the source of
  // every figure below, so the counts cost no extra round trip.
  const [requestsResult, customersResult] = await Promise.all([
    $876.requests.list(org.id),
    $876.customerProfiles.list(org.id),
  ])

  if (
    requestsResult.error?.code === 'crm/tenant-not-found' ||
    customersResult.error?.code === 'crm/tenant-not-found'
  )
    return <NoCrmWorkspace />
  if (requestsResult.error) throw new Error(requestsResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)

  const base = workspaceBase(slug, 'crm')
  const requests = requestsResult.data.data
  const openCount = requests.filter((request) =>
    OPEN_STATUSES.has(request.status)
  ).length
  const recent = requests
    .toSorted((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT_LIMIT)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Clock} label="Open requests" value={openCount} />
        <StatTile
          icon={ClipboardList}
          label="Total requests"
          value={requestsResult.data.total_count ?? requests.length}
        />
        <StatTile
          icon={Users}
          label="Customers"
          value={
            customersResult.data.total_count ?? customersResult.data.data.length
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
        <RequestsTable
          requestsHref={`${base}/requests`}
          requests={recent.map((request) => ({
            id: request.id,
            number: request.number,
            subject: request.subject,
            customerId: request.customerId,
            assigneeId: request.assigneeId,
            status: request.status,
            priority: request.priority,
            source: request.source,
            createdAt: request.createdAt,
          }))}
        />
      </div>
    </>
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
