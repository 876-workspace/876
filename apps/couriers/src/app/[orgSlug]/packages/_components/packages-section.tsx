'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import type { PackageFormOption } from '../_lib/package-form-data'
import {
  PACKAGES_DROPDOWN_ACTIONS,
  PACKAGE_STATUS_OPTIONS,
  resolvePackageStatusFilter,
} from '../_lib/packages-list-config'
import { PackageCategoryFilter } from './package-category-filter'

export const PACKAGES_TAKEOVER_SEGMENTS = ['edit'] as const

export function PackagesSection({
  orgSlug,
  categoryOptions,
  list,
  children,
}: {
  orgSlug: string
  categoryOptions: Promise<PackageFormOption[]>
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
            <div className="flex items-center gap-2">
              <StatusFilterHeading
                label="Packages"
                value={status}
                options={[...PACKAGE_STATUS_OPTIONS]}
              />
              <PackageCategoryFilter categoryOptions={categoryOptions} />
            </div>
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
