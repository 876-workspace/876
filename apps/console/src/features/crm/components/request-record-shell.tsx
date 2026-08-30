import { RequestRecordShell as SharedRequestRecordShell } from '@876/crm-ui/request-record-shell'

import { RequestAside, RequestAsideSkeleton } from './request-aside'
import {
  RequestIdentity,
  RequestIdentitySkeleton,
  RequestToolbar,
  RequestToolbarSkeleton,
} from './request-identity'

type Props = {
  requestId: string
  /** CRM service workspace owner; omitted for Console's platform CRM surface. */
  organizationId?: string
  /** The record's own base path — every shared tab is built from it. */
  baseHref: string
  className?: string
  children: React.ReactNode
}

/**
 * Console host adapter for the canonical CRM request record. The outer Console
 * organization workspace remains responsible for its floating sidebar and
 * app-level navigation; this component only fills the workspace content area.
 */
export function RequestRecordShell({
  requestId,
  organizationId,
  baseHref,
  className,
  children,
}: Props) {
  return (
    <SharedRequestRecordShell
      className={className}
      baseHref={baseHref}
      toolbar={
        <RequestToolbar
          organizationId={organizationId}
          requestId={requestId}
          baseHref={baseHref}
        />
      }
      toolbarFallback={<RequestToolbarSkeleton />}
      header={
        <RequestIdentity
          organizationId={organizationId}
          requestId={requestId}
          baseHref={baseHref}
        />
      }
      headerFallback={<RequestIdentitySkeleton />}
      aside={
        <RequestAside
          organizationId={organizationId}
          requestId={requestId}
          baseHref={baseHref}
        />
      }
      asideFallback={<RequestAsideSkeleton />}
    >
      {children}
    </SharedRequestRecordShell>
  )
}
