import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminOrganization } from '@876/admin'
import { PageBreadcrumb } from '@876/ui/page'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ACCOUNTS_SKELETON_COLUMNS } from './_components/accounts-skeleton-columns'

import { resolveOrg, resolveOrgBillingAccounts } from '../../_data'
import {
  AccountsManager,
  type AccountsView,
} from '@/app/(app)/orgs/[slug]/billing/_components/accounts-manager'

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ view?: string | string[] }>
}

const accountViews = new Set<AccountsView>(['grid', 'table', 'list'])

function resolveAccountsView(
  value: string | string[] | undefined
): AccountsView {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && accountViews.has(candidate as AccountsView)
    ? (candidate as AccountsView)
    : 'grid'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Billing accounts' }
  return {
    title: `${org.name ?? org.slug} • Billing accounts - Organizations`,
  }
}

export default async function OrganizationBillingAccountsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing`}
          label="Billing"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">Accounts</h1>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={ACCOUNTS_SKELETON_COLUMNS} />}
      >
        <BillingAccountsShell slug={slug} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function BillingAccountsShell({
  slug,
  searchParams,
}: {
  slug: string
  searchParams: Props['searchParams']
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <BillingAccountsData org={org} slug={slug} searchParams={searchParams} />
  )
}

async function BillingAccountsData({
  org,
  slug,
  searchParams,
}: {
  org: AdminOrganization
  slug: string
  searchParams: Props['searchParams']
}) {
  const [resolvedSearchParams, accounts] = await Promise.all([
    searchParams,
    resolveOrgBillingAccounts(org.id),
  ])
  const view = resolveAccountsView(resolvedSearchParams?.view)

  return (
    <AccountsManager
      orgSlug={slug}
      accounts={accounts?.data ?? []}
      view={view}
    />
  )
}
