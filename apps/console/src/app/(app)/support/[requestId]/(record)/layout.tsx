import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Page } from '@876/ui/page'
import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

import { $876 } from '@/lib/876'
import { getPlatformOrganization } from '@/lib/platform-org'

import {
  RequestIdentity,
  RequestIdentitySkeleton,
  RequestToolbar,
  RequestToolbarSkeleton,
} from '@/features/support/components/request-identity'
import {
  RequestAside,
  RequestAsideSkeleton,
} from '@/features/support/components/request-aside'

type Props = {
  children: React.ReactNode
  params: Promise<{ requestId: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ requestId: string }>
}): Promise<Metadata> {
  const org = await getPlatformOrganization()
  if (!org) return { title: 'Support' }
  const { requestId } = await params
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
 * The support request record shell.
 *
 * Awaits `params` and nothing else.
 */
export default async function SupportRequestRecordLayout({
  children,
  params,
}: Props) {
  const { requestId } = await params
  const base = `/support/${requestId}`

  const tabs: RouteTabItem[] = [
    { label: 'Conversation', href: base, exact: true },
    { label: 'Customer', href: `${base}/customer` },
    { label: 'Tasks', href: `${base}/tasks` },
    { label: 'Reminders', href: `${base}/reminders` },
    { label: 'Audit', href: `${base}/audit` },
  ]

  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <Suspense fallback={<RequestToolbarSkeleton />}>
        <RequestToolbar requestId={requestId} />
      </Suspense>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <header className="mb-5">
            <Suspense fallback={<RequestIdentitySkeleton />}>
              <RequestIdentity requestId={requestId} />
            </Suspense>
          </header>

          <RouteTabs tabs={tabs} className="876-detail-header-tabs mb-5" />
          {children}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <Suspense fallback={<RequestAsideSkeleton />}>
            <RequestAside requestId={requestId} />
          </Suspense>
        </aside>
      </div>
    </Page>
  )
}
