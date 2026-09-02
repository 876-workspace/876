import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ItemsTable } from '@876/billing-ui/items-table'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { BILLING_ITEMS_SKELETON_COLUMNS } from '@/features/billing/components/items-skeleton-columns'
import { toItemRow } from '@/features/billing/item-rows'
import { formatBillingAmount } from '@/features/billing/money'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { billing } from '@/lib/services/billing'

import { resolveOrg } from '../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Items' }

  return { title: `${org.name ?? org.slug} • Items - Billing` }
}

/**
 * The toolbar is static chrome and renders before the list resolves; only the
 * table waits (`CLAUDE.md` → Loading States & Suspense Placement).
 */
export default async function BillingWorkspaceItemsPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="space-y-4">
      <ResourceToolbar title="Items" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={BILLING_ITEMS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <ItemsData slug={slug} />
      </Suspense>
    </div>
  )
}

async function ItemsData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  // The tenant is read for its default currency only, so it starts alongside
  // the items rather than behind them.
  const [result, tenant] = await Promise.all([
    billing.items.list(org.id),
    billing.organizations.retrieve(org.id),
  ])
  if (result.error)
    return (
      <AppError
        title="Items are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <ItemsTable
      items={(result.data?.data ?? []).map(toItemRow)}
      defaultCurrency={tenant.data?.defaultCurrency ?? 'JMD'}
      baseHref={`${workspaceBase(slug, 'billing')}/items`}
      formatAmount={formatBillingAmount}
      emptyState={
        <p className="text-muted-foreground py-10 text-center text-sm">
          No catalog items exist in this workspace yet.
        </p>
      }
    />
  )
}
