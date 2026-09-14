import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
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
import { requireAppPermission } from '@/lib/auth/guards'
import { getInvoice } from '@/lib/invoice'

export const metadata = { title: 'New request' }

export default async function NewRequestPage() {
  await requireAppPermission('requests.create')
  const invoice = await getInvoice()
  const result = invoice
    ? await invoice.customers.list({ status: 'ACTIVE' })
    : {
        data: null,
        error: { code: 'auth/forbidden', message: 'Forbidden.' },
      }

  const customerOptions =
    result.data?.data.map((customer) => ({
      id: customer.id,
      name: customer.name,
      description:
        customer.email ??
        customer.primaryContact?.email ??
        customer.phone ??
        customer.workPhone ??
        null,
    })) ?? []

  return (
    <DetailCard aria-label="New request">
      <DetailCardHeader title="New request" closeHref="/requests" />
      <DetailCardBody>
        {result.error ? (
          <AppError
            title="Customers could not be loaded"
            error={result.error}
            variant="inline"
          />
        ) : customerOptions.length === 0 ? (
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
