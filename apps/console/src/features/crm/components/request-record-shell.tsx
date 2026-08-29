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
   * The organization whose CRM service workspace owns this request. Omitted on
   * Console's platform request surface, which resolves 876's own organization.
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
 * Both surfaces that open a request — Console's platform `/requests` surface
 * over 876's CRM service workspace and an organization's CRM workspace — mount
 * this one shell. The only thing a surface supplies is *which* workspace and
 * *where* the record lives. Product entitlement is not inferred here.
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
