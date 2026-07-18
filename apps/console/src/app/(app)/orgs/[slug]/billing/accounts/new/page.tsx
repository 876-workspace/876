import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveOrg } from '../../../_data'
import { BillingAccountCreate } from './account-create'

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
  const org = await resolveOrg(slug)
  if (!org) notFound()

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

      <BillingAccountCreate orgId={org.id} orgSlug={slug} />
    </div>
  )
}
