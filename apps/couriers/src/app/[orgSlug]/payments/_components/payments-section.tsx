'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  PAYMENTS_DROPDOWN_ACTIONS,
  PAYMENT_STATUS_OPTIONS,
  resolvePaymentStatus,
} from '../_lib/payments-list-config'

export function PaymentsSection({
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
  const { selected } = resolvePaymentStatus(
    useSearchParams().get('status') ?? undefined
  )

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Payments"
          titleFilter={
            <StatusFilterHeading
              label="Payments"
              value={selected}
              options={PAYMENT_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/payments/new`}
          primaryVariant="info"
          refresh
          dropdownActions={PAYMENTS_DROPDOWN_ACTIONS}
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
