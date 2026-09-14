import type { Package } from '@876/couriers/admin'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { RectangleStackIcon } from '@876/ui/icons'

import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData } from '@/lib/couriers'
import { billingIntegration } from '@/lib/services/billing'
import { couriersOperator } from '@/lib/services/couriers'

import { packageStatusLabel } from '../_lib/packages-list-config'
import { PackagesList } from './packages-list'
import type { PackageTableRow } from './packages-table'

const PAGE_SIZE = 100

export async function PackagesListData({ orgSlug }: { orgSlug: string }) {
  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RectangleStackIcon />
        </EmptyMedia>
        <EmptyTitle>No packages</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <PackagesList packages={[]} orgSlug={orgSlug} emptyState={emptyState} />
    )

  let packages: Package[] = []
  try {
    packages = await listAllPackages(ctx.tenant.id)
  } catch (error) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <LoadError error={error} fallback="Failed to load packages." />
        <PackagesList packages={[]} orgSlug={orgSlug} emptyState={emptyState} />
      </div>
    )
  }

  if (packages.length === 0)
    return (
      <PackagesList packages={[]} orgSlug={orgSlug} emptyState={emptyState} />
    )

  const [profilesResult, branchesResult] = await Promise.allSettled([
    listAllCustomerProfiles(ctx.tenant.id),
    couriersOperator.branches.list(ctx.tenant.id),
  ])

  const profiles =
    profilesResult.status === 'fulfilled' ? profilesResult.value : []
  const branchList =
    branchesResult.status === 'fulfilled' && !branchesResult.value.error
      ? branchesResult.value.data.data
      : []

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const branchById = new Map(branchList.map((branch) => [branch.id, branch]))

  const billingIds = [
    ...new Set(
      packages.flatMap((pkg) => {
        const profile = profileById.get(pkg.customer_id)
        return profile ? [profile.billing_customer_id] : []
      })
    ),
  ]
  const identities = await listBillingCustomers(ctx.orgId, billingIds)
  const identityById = new Map(
    identities.map((customer) => [customer.id, customer])
  )

  const rows: PackageTableRow[] = packages.map((pkg) => {
    const profile = profileById.get(pkg.customer_id)
    const identity = profile
      ? identityById.get(profile.billing_customer_id)
      : undefined
    const customerName =
      [identity?.firstName, identity?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      identity?.name ||
      identity?.companyName ||
      profile?.billing_customer_id ||
      pkg.customer_id

    return {
      id: pkg.id,
      customerName,
      description: pkg.description ?? '—',
      trackingNumber: pkg.tracking_num ?? pkg.id,
      branch: pkg.branch_id
        ? (branchById.get(pkg.branch_id)?.name ?? pkg.branch_id)
        : '—',
      category: pkg.category?.name ?? 'Uncategorized',
      categoryId: pkg.category_id ?? null,
      status: packageStatusLabel(pkg.status),
      statusCode: pkg.status,
    }
  })

  return (
    <PackagesList packages={rows} orgSlug={orgSlug} emptyState={emptyState} />
  )
}

async function listAllPackages(tenantId: string) {
  const rows: Package[] = []
  let startingAfter: string | undefined

  for (;;) {
    const page = requireCouriersData(
      await couriersOperator.packages.list(tenantId, {
        limit: PAGE_SIZE,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
    )
    rows.push(...page.data)
    const lastId = page.data.at(-1)?.id
    if (!page.has_more || !lastId) return rows
    startingAfter = lastId
  }
}

async function listAllCustomerProfiles(tenantId: string) {
  const rows: Array<{
    id: string
    billing_customer_id: string
  }> = []
  let startingAfter: string | undefined

  for (;;) {
    const page = requireCouriersData(
      await couriersOperator.customers.list(tenantId, {
        limit: PAGE_SIZE,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
    )
    rows.push(
      ...page.data.map((profile) => ({
        id: profile.id,
        billing_customer_id: profile.billing_customer_id,
      }))
    )
    const lastId = page.data.at(-1)?.id
    if (!page.has_more || !lastId) return rows
    startingAfter = lastId
  }
}

async function listBillingCustomers(orgId: string, ids: string[]) {
  if (ids.length === 0) return []

  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += PAGE_SIZE)
    chunks.push(ids.slice(index, index + PAGE_SIZE))

  const pages = await Promise.all(
    chunks.map((chunk) =>
      billingIntegration.customers.list(orgId, {
        ids: chunk,
        limit: PAGE_SIZE,
      })
    )
  )

  return pages.flatMap((page) => page.data?.data ?? [])
}

function LoadError({ error, fallback }: { error: unknown; fallback: string }) {
  const message = error instanceof Error ? error.message : fallback
  return (
    <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-[0.8125rem]">
      {message}
    </div>
  )
}
