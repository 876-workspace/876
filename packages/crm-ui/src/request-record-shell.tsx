import { Suspense, type ReactNode } from 'react'
import { RecordSplitView } from '@876/ui/record-split-view'
import type { RouteTabItem } from '@876/ui/route-tabs'

export type RequestRecordShellProps = {
  baseHref: string
  className?: string
  toolbar: ReactNode
  toolbarFallback?: ReactNode
  header: ReactNode
  headerFallback?: ReactNode
  aside: ReactNode
  asideFallback?: ReactNode
  children: ReactNode
}

/**
 * The canonical CRM request record tabs. Hosts supply only their route base;
 * product capabilities stay in one place so standalone CRM and embedded hosts
 * cannot silently drift apart.
 */
export function requestRecordTabs(baseHref: string): RouteTabItem[] {
  return [
    { label: 'Conversation', href: baseHref, exact: true },
    { label: 'Customer', href: `${baseHref}/customer` },
    { label: 'Tasks', href: `${baseHref}/tasks` },
    { label: 'Reminders', href: `${baseHref}/reminders` },
    { label: 'Schedule', href: `${baseHref}/schedule` },
    { label: 'Activity', href: `${baseHref}/activity` },
  ]
}

/**
 * Shared CRM record composition. Routing, authorization and data loading stay
 * with the host; this package owns only the product-level visual contract.
 */
export function RequestRecordShell({
  baseHref,
  className,
  toolbar,
  toolbarFallback = null,
  header,
  headerFallback = null,
  aside,
  asideFallback = null,
  children,
}: RequestRecordShellProps) {
  return (
    <RecordSplitView
      className={className}
      tabs={requestRecordTabs(baseHref)}
      toolbar={<Suspense fallback={toolbarFallback}>{toolbar}</Suspense>}
      header={<Suspense fallback={headerFallback}>{header}</Suspense>}
      aside={<Suspense fallback={asideFallback}>{aside}</Suspense>}
    >
      {children}
    </RecordSplitView>
  )
}
