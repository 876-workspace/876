import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Page } from '@876/ui/page'
import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import {
  RequestIdentity,
  RequestIdentitySkeleton,
  RequestToolbar,
  RequestToolbarSkeleton,
} from '../_components/request-identity'
import {
  RequestAside,
  RequestAsideSkeleton,
} from '../_components/request-aside'

type Props = {
  children: React.ReactNode
  params: Promise<{ requestId: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ requestId: string }>
}): Promise<Metadata> {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const { requestId } = await params
  const result = await $876.requests.retrieve(context.orgId, requestId)
  if (!result.data) return { title: 'Request' }

  // A template, so a section tab reads "Tasks · Request #12" instead of
  // dropping the record the tab belongs to out of the browser tab.
  return {
    title: {
      default: `Request #${result.data.number} · ${result.data.subject}`,
      template: `%s · Request #${result.data.number}`,
    },
  }
}

/**
 * The request record shell.
 *
 * Only the middle column is a route: the identity band above and the customer
 * column beside it belong to the record, not to any one section, so switching
 * tabs swaps the thread for tasks or audit and leaves everything else in
 * place.
 *
 * The layout itself awaits `params` and nothing else — a layout that awaits
 * data suspends into the *list's* boundary, so the click would land back on
 * the requests table. Both data regions stream behind their own fallbacks and
 * the tabs, built from the id alone, are real and clickable immediately.
 */
export default async function RequestRecordLayout({ children, params }: Props) {
  const { requestId } = await params
  const base = `/requests/${requestId}`

  const tabs: RouteTabItem[] = [
    { label: 'Conversation', href: base, exact: true },
    { label: 'Customer', href: `${base}/customer` },
    { label: 'Tasks', href: `${base}/tasks` },
    { label: 'Reminders', href: `${base}/reminders` },
    { label: 'Audit', href: `${base}/audit` },
  ]

  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      {/*
        The toolbar spans the record; everything below it is two columns. The
        customer column is a sibling of the identity band rather than a block
        under it, so it starts level with the subject instead of a third of
        the way down an empty gutter.
      */}
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
