import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'

import { resolveOrg } from '../../../../_data'
import { BillingAccountEdit } from './account-edit'

type Props = { params: Promise<{ slug: string; accountId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, accountId } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Edit billing account' }

  return {
    title: `${org.name ?? org.slug} • ${accountId} - Billing accounts`,
  }
}

export default async function EditBillingAccountPage({ params }: Props) {
  const { slug, accountId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const { data: account } = await $876.billingAccounts.retrieve(accountId)
  if (!account || account.organization_id !== org.id) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing/accounts`}
          label="Accounts"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">Edit Account</h1>
      </div>

      <BillingAccountEdit account={account} orgSlug={slug} />
    </div>
  )
}
