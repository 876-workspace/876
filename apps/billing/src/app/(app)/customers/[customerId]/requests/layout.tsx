import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { RequestListDetailShell } from '@876/crm-ui/request-list-detail-shell'

import {
  hasPermission,
  requireBillingFeature,
  requirePagePermission,
} from '@/lib/auth/billing-context'

import {
  CustomerRequestList,
  CustomerRequestListSkeleton,
} from './_components/customer-request-list'

export default async function CustomerRequestsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ customerId: string }>
}) {
  const [context, , { customerId }] = await Promise.all([
    requirePagePermission('customers:read'),
    requireBillingFeature('requests'),
    params,
  ])
  const baseHref = `/customers/${encodeURIComponent(customerId)}/requests`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RequestListDetailShell
        baseHref={baseHref}
        canCreate={hasPermission(context, 'customers:write')}
        list={
          <Suspense fallback={<CustomerRequestListSkeleton />}>
            <CustomerRequestList customerId={customerId} baseHref={baseHref} />
          </Suspense>
        }
      >
        {children}
      </RequestListDetailShell>
    </div>
  )
}
