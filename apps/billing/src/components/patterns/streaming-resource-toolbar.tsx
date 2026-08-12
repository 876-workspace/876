'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { useBillingPermission } from '@/components/providers/billing-permissions-provider'
import type { Permission } from '@/types/access'

type Action = {
  label: string
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
  dropdownAction,
}: {
  title: string
  status: string
  options: StatusFilterOption[]
  primary?: Action
  dropdownAction?: Action
}) {
  const canUsePrimary = useBillingPermission(
    primary?.permission ?? 'billing:access'
  )
  const canUseDropdown = useBillingPermission(
    dropdownAction?.permission ?? 'billing:access'
  )

  return (
    <ResourceToolbar
      title={title}
      titleFilter={
        <StatusFilterHeading label={title} value={status} options={options} />
      }
      primaryLabel={canUsePrimary ? primary?.label : undefined}
      primaryHref={canUsePrimary ? primary?.href : undefined}
      primaryVariant="info"
      refresh
      dropdownActions={
        canUseDropdown && dropdownAction
          ? [
              {
                label: dropdownAction.label,
                icon: 'import',
                href: dropdownAction.href,
              },
            ]
          : []
      }
    />
  )
}
