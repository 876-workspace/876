import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { RequestListDetailShell } from '@876/crm-ui/request-list-detail-shell'

import { canAccess } from '@/lib/auth/access-context'
import { requireAppCapability } from '@/lib/auth/guards'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'

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
  const [access, { customerId }] = await Promise.all([
    requireAppCapability({
      permission: 'requests.view',
      feature: INVOICE_REQUESTS_SLUG,
    }),
    params,
  ])
  const baseHref = `/customers/${encodeURIComponent(customerId)}/requests`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RequestListDetailShell
        baseHref={baseHref}
        canCreate={canAccess(access, 'requests.create')}
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
