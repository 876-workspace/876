'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  ITEM_STATUS_OPTIONS,
  ITEMS_DROPDOWN_ACTIONS,
  resolveItemStatusFilter,
} from '../_lib/items-list-config'

/**
 * The shared-catalog section: the toolbar and the item list stay mounted while
 * an item opens beside them. The catalog is read-only from Couriers, so the
 * toolbar carries no primary action and no route takes over the content area.
 */
export function ItemsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = resolveItemStatusFilter(useSearchParams().get('status'))

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Items"
          titleFilter={
            <StatusFilterHeading
              label="Items"
              value={status}
              options={ITEM_STATUS_OPTIONS}
            />
          }
          refresh
          dropdownActions={ITEMS_DROPDOWN_ACTIONS}
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
