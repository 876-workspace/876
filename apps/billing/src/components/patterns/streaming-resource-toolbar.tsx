'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { useBillingPermission } from '@/components/providers/permissions-provider'
import type { Permission } from '@/types/access'

export type StreamingResourceAction = {
  href: string
  permission: Permission
}

/**
 * The stable chrome for a streamed resource list.
 *
 * Like Couriers' and Console's list toolbars, this uses the permission snapshot
 * already loaded by the persistent application shell. It never awaits list
 * data, so the title, active filter, and permitted actions paint immediately.
 */
export function StreamingResourceToolbar({
  title,
  status,
  options,
  primary,
}: {
  title: string
  status: string
  options: StatusFilterOption[]
  primary?: StreamingResourceAction
}) {
  const canUsePrimary = useBillingPermission(
    primary?.permission ?? 'billing:access'
  )

  return (
    <ResourceToolbar
      title={title}
      titleFilter={
        <StatusFilterHeading label={title} value={status} options={options} />
      }
      primaryLabel={canUsePrimary && primary ? 'Add' : undefined}
      primaryHref={canUsePrimary ? primary?.href : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
