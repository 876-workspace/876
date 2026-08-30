'use client'

import type { ReactNode } from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import {
  CustomerCardFrame,
  type CustomerTab,
} from '@876/crm-ui/customer-card-frame'
import type { CrmCustomerRow } from '@876/crm-ui/customer-list'

const CONSOLE_CUSTOMER_TABS: readonly CustomerTab[] = [
  { segment: null, label: 'Overview' },
  { segment: 'requests', label: 'Requests' },
]

/**
 * Console adapter for the shared CRM customer record.
 *
 * Console supplies only its route base. Workspace navigation remains outside
 * this component in `WorkspaceShell`, so the floating rail is preserved.
 */
export function CustomerCard({
  customer,
  baseHref,
  children,
}: {
  customer: CrmCustomerRow
  baseHref: string
  children: ReactNode
}) {
  const activeSegment = useSelectedLayoutSegment()

  return (
    <CustomerCardFrame
      customer={customer}
      baseHref={baseHref}
      activeSegment={activeSegment}
      tabs={CONSOLE_CUSTOMER_TABS}
    >
      {children}
    </CustomerCardFrame>
  )
}
