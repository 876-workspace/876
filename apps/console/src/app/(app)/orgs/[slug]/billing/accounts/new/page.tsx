import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { resolveOrg } from '../../../_data'
import { BillingAccountCreate } from './_components/account-create'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'New billing account' }
  return {
    title: `${org.name ?? org.slug} • New billing account - Organizations`,
  }
}

export default async function NewBillingAccountPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing/accounts`}
          label="Accounts"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">New Account</h1>
      </div>

      <Suspense fallback={<AccountCreateFallback />}>
        <BillingAccountCreateData slug={slug} />
      </Suspense>
    </div>
  )
}

async function BillingAccountCreateData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <BillingAccountCreate orgId={org.id} orgSlug={slug} />
}

function AccountCreateFallback() {
  return (
    <div className="876-card space-y-5 p-5">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
