import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Page } from '@876/ui/page'
import { RecordSplitView } from '@876/ui/record-split-view'
import type { RouteTabItem } from '@876/ui/route-tabs'

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
 * The split itself is `RecordSplitView` from `@876/ui`, shared with Console's
 * support desk and its organization CRM workspaces, so all three surfaces stay
 * the same record — only the middle column is a route: the identity band above
 * and the customer column beside it belong to the record, not to any one
 * section, so switching tabs swaps the thread for tasks or audit and leaves
 * everything else in place.
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
      <RecordSplitView
        tabs={tabs}
        toolbar={
          <Suspense fallback={<RequestToolbarSkeleton />}>
            <RequestToolbar requestId={requestId} />
          </Suspense>
        }
        header={
          <Suspense fallback={<RequestIdentitySkeleton />}>
            <RequestIdentity requestId={requestId} />
          </Suspense>
        }
        aside={
          <Suspense fallback={<RequestAsideSkeleton />}>
            <RequestAside requestId={requestId} />
          </Suspense>
        }
      >
        {children}
      </RecordSplitView>
    </Page>
  )
}
