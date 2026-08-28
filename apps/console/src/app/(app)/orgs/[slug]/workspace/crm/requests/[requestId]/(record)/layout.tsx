import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

import { $876 } from '@/lib/876'
import {
  RequestIdentity,
  RequestIdentitySkeleton,
  RequestToolbar,
  RequestToolbarSkeleton,
} from '@/features/crm/components/request-identity'
import {
  RequestAside,
  RequestAsideSkeleton,
} from '@/features/crm/components/request-aside'
import { resolveOrg } from '../../../../../_data'

type Props = {
  children: React.ReactNode
  params: Promise<{ slug: string; requestId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Request' }
  const result = await $876.requests.retrieve(org.id, requestId)
  if (!result.data) return { title: 'Request' }

  return {
    title: {
      default: `Request #${result.data.number} · ${result.data.subject}`,
      template: `%s · Request #${result.data.number}`,
    },
  }
}

/**
 * The org-scoped CRM request record shell.
 *
 * Implements the full split record layout matching 876 CRM and the Console support desk.
 */
export default async function OrgRequestRecordLayout({
  children,
  params,
}: Props) {
  const { slug, requestId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const base = `/orgs/${slug}/workspace/crm/requests/${requestId}`

  const tabs: RouteTabItem[] = [
    { label: 'Conversation', href: base, exact: true },
    { label: 'Customer', href: `${base}/customer` },
    { label: 'Tasks', href: `${base}/tasks` },
    { label: 'Reminders', href: `${base}/reminders` },
    { label: 'Audit', href: `${base}/audit` },
  ]

  return (
    <div className="space-y-4">
      <Suspense fallback={<RequestToolbarSkeleton />}>
        <RequestToolbar
          organizationId={org.id}
          requestId={requestId}
          baseHref={base}
        />
      </Suspense>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <header className="mb-5">
            <Suspense fallback={<RequestIdentitySkeleton />}>
              <RequestIdentity organizationId={org.id} requestId={requestId} />
            </Suspense>
          </header>

          <RouteTabs tabs={tabs} className="876-detail-header-tabs mb-5" />
          {children}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <Suspense fallback={<RequestAsideSkeleton />}>
            <RequestAside organizationId={org.id} requestId={requestId} />
          </Suspense>
        </aside>
      </div>
    </div>
  )
}
