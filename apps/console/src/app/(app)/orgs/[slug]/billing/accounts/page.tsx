import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveOrg, resolveOrgBillingAccounts } from '../../_data'
import { AccountsManager, type AccountsView } from '../accounts-manager'

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
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const accounts = await resolveOrgBillingAccounts(org.id)
  const view = resolveAccountsView(resolvedSearchParams?.view)

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

      <AccountsManager
        orgSlug={slug}
        accounts={accounts?.data ?? []}
        view={view}
      />
    </div>
  )
}
