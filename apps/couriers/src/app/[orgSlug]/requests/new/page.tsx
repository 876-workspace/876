import { notFound } from 'next/navigation'

import { getError, toAppError } from '@876/core'
import type { RequestComposerCustomerOption } from '@876/crm-ui/request-composer'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import Link from 'next/link'

import { RequestComposerClient } from '../_components/request-composer-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/services/crm'

export const metadata = { title: 'New request' }

export default async function NewRequestPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()

  const result = await crm.customers.list(context.orgId)
  const options: RequestComposerCustomerOption[] =
    result.data?.data.map((customer) => ({
      id: customer.profile.billingCustomerId,
      name: customer.customer?.name ?? customer.profile.billingCustomerId,
      description: customer.customer?.email ?? customer.customer?.phone ?? null,
    })) ?? []
  const baseHref = `/${orgSlug}/requests`

  return (
    <DetailCard aria-label="New request">
      <DetailCardHeader title="New request" closeHref={baseHref} />
      <DetailCardBody>
        {result.error ? (
          <AppError
            title="Customers could not be loaded"
            error={toAppError(getError(result.error.code))}
            variant="inline"
          />
        ) : options.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No customers available</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="info"
                render={<Link href={`/${orgSlug}/customers/new`} />}
              >
                Add
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <RequestComposerClient
            orgSlug={orgSlug}
            baseHref={baseHref}
            customerOptions={options}
          />
        )}
      </DetailCardBody>
    </DetailCard>
  )
}
