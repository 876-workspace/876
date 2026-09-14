'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  PACKAGES_DROPDOWN_ACTIONS,
  PACKAGE_STATUS_OPTIONS,
  resolvePackageStatusFilter,
} from '../_lib/packages-list-config'

export const PACKAGES_TAKEOVER_SEGMENTS = ['edit'] as const

export function PackagesSection({
  orgSlug,
  list,
  children,
}: {
  orgSlug: string
  list: ReactNode
  children: ReactNode
}) {
  const status = resolvePackageStatusFilter(useSearchParams().get('status'))

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Packages"
          titleFilter={
            <StatusFilterHeading
              label="Packages"
              value={status}
              options={PACKAGE_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/packages/new`}
          primaryVariant="info"
          refresh
          dropdownActions={PACKAGES_DROPDOWN_ACTIONS}
        />
      }
      list={list}
      takeoverSegments={PACKAGES_TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
