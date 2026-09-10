import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'
import { CustomerActions } from './_components/customer-actions'

export default async function CustomerDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const base = `/customers/${customerId}`
  const tabs = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Transactions', href: `${base}/transactions` },
    { label: 'Requests', href: `${base}/requests` },
    { label: 'Mails', href: `${base}/mails` },
    { label: 'Statement', href: `${base}/statement` },
    { label: 'Activity', href: `${base}/activity` },
  ]

  return (
    <DetailCard aria-label="Customer">
      <Suspense fallback={<CustomerHeaderSkeleton />}>
        <CustomerHeaderData customerId={customerId} />
      </Suspense>
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function CustomerHeaderData({ customerId }: { customerId: string }) {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.customers.retrieve(customerId)
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return null
  }

  const customer = result.data

  return (
    <DetailCardHeader
      icon={<CustomerAvatar name={customer.name} size="lg" />}
      title={customer.name}
      actions={
        <CustomerActions
          customerId={customer.id}
          customerName={customer.name}
          canManage={context.role !== 'staff'}
        />
      }
      closeHref="/customers"
      closeLabel="Close customer details"
    />
  )
}

function CustomerHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 rounded-full sm:size-16" />}
      title={<Skeleton className="h-6 w-44" />}
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
      closeHref="/customers"
      closeLabel="Close customer details"
    />
  )
}
