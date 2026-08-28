import { Suspense } from 'react'

import { RecordSplitView } from '@876/ui/record-split-view'
import type { RouteTabItem } from '@876/ui/route-tabs'

import { RequestAside, RequestAsideSkeleton } from './request-aside'
import {
  RequestIdentity,
  RequestIdentitySkeleton,
  RequestToolbar,
  RequestToolbarSkeleton,
} from './request-identity'

type Props = {
  requestId: string
  /**
   * The organization whose CRM this request belongs to. Omitted on the platform
   * support desk, which resolves 876's own organization.
   */
  organizationId?: string
  /** The record's own base path — every tab and action is built from it. */
  baseHref: string
  className?: string
  children: React.ReactNode
}

/** The record's section tabs. Built from the path alone, so they never wait on data. */
function requestRecordTabs(baseHref: string): RouteTabItem[] {
  return [
    { label: 'Conversation', href: baseHref, exact: true },
    { label: 'Customer', href: `${baseHref}/customer` },
    { label: 'Tasks', href: `${baseHref}/tasks` },
    { label: 'Reminders', href: `${baseHref}/reminders` },
    { label: 'Audit', href: `${baseHref}/audit` },
  ]
}

/**
 * The CRM request record, as Console renders it everywhere.
 *
 * Both surfaces that open a request — the platform support desk at `/support`
 * and an organization's CRM workspace — mount this one shell, so the record
 * looks and behaves identically in both and a change to it lands on both. The
 * only thing a surface supplies is *which* organization and *where* it lives.
 *
 * Every region streams behind its own boundary; the shell itself awaits nothing,
 * so a click from the requests table lands on the record immediately.
 */
export function RequestRecordShell({
  requestId,
  organizationId,
  baseHref,
  className,
  children,
}: Props) {
  return (
    <RecordSplitView
      className={className}
      tabs={requestRecordTabs(baseHref)}
      toolbar={
        <Suspense fallback={<RequestToolbarSkeleton />}>
          <RequestToolbar
            organizationId={organizationId}
            requestId={requestId}
            baseHref={baseHref}
          />
        </Suspense>
      }
      header={
        <Suspense fallback={<RequestIdentitySkeleton />}>
          <RequestIdentity
            organizationId={organizationId}
            requestId={requestId}
            baseHref={baseHref}
          />
        </Suspense>
      }
      aside={
        <Suspense fallback={<RequestAsideSkeleton />}>
          <RequestAside
            organizationId={organizationId}
            requestId={requestId}
            baseHref={baseHref}
          />
        </Suspense>
      }
    >
      {children}
    </RecordSplitView>
  )
}
