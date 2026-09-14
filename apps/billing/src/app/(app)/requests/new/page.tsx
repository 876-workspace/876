import Link from 'next/link'

import { Button } from '@876/ui/button'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@876/ui/empty'

import { RequestComposerClient } from '@/features/crm/request-composer-client'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New request' }

export default async function NewRequestPage() {
  const context = await requirePagePermission('customers:write')
  const customers = await service.customers.list(context.tenant.id, 'ACTIVE')
  const customerOptions = customers.map((customer) => ({
    id: String(customer.id),
    name: String(customer.name ?? customer.companyName ?? customer.id),
    description:
      typeof customer.email === 'string'
        ? customer.email
        : typeof customer.phone === 'string'
          ? customer.phone
          : null,
  }))

  return (
    <DetailCard aria-label="New request">
      <DetailCardHeader title="New request" closeHref="/requests" />
      <DetailCardBody>
        {customerOptions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No customers available</EmptyTitle>
              <EmptyDescription>
                Create a customer before opening a request.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href="/customers/new" />}>Add customer</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <RequestComposerClient
            baseHref="/requests"
            customerOptions={customerOptions}
          />
        )}
      </DetailCardBody>
    </DetailCard>
  )
}
