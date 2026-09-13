'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  MANIFESTS_DROPDOWN_ACTIONS,
  MANIFEST_STATUS_OPTIONS,
  resolveManifestStatusFilter,
} from '../_lib/manifest-list-config'

export function ManifestSection({
  orgSlug,
  list,
  children,
}: {
  orgSlug: string
  list: ReactNode
  children: ReactNode
}) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = resolveManifestStatusFilter(useSearchParams().get('status'))

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Manifests"
          titleFilter={
            <StatusFilterHeading
              label="Manifests"
              value={status}
              options={MANIFEST_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/packages/manifest/new`}
          primaryVariant="info"
          refresh
          dropdownActions={MANIFESTS_DROPDOWN_ACTIONS}
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
