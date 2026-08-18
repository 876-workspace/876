import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { resolveOrg } from '../../../_data'
import { CustomerCreateForm } from './_components/customer-create-form'

type Props = { params: Promise<{ slug: string }> }

export default function NewBillingCustomerPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Billing customer</h1>
      </div>
      <Suspense fallback={<CustomerCreateFallback />}>
        <CustomerCreateData params={params} />
      </Suspense>
    </div>
  )
}

async function CustomerCreateData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <>
      <p className="text-muted-foreground -mt-4 text-[0.8125rem]">
        Create a customer in {org.name ?? org.slug}&apos;s Billing workspace.
      </p>
      <CustomerCreateForm organizationId={org.id} orgSlug={org.slug} />
    </>
  )
}

function CustomerCreateFallback() {
  return (
    <>
      <Skeleton className="h-4 w-80" />
      <div className="876-card space-y-5 p-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </>
  )
}
