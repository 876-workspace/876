import 'server-only'

import type { PackageCategory } from '@876/couriers/admin'

import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData } from '@/lib/couriers'
import { billingIntegration } from '@/lib/services/billing'
import { couriersOperator } from '@/lib/services/couriers'

const PAGE_SIZE = 100

export type PackageFormOption = { value: string; label: string }

export async function loadPackageFormOptions(orgSlug: string) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return { customers: [], branches: [], categories: [] }

  const [profiles, branchesResult, categories] = await Promise.all([
    listAllCustomerProfiles(ctx.tenant.id),
    couriersOperator.branches.list(ctx.tenant.id),
    listAllCategories(ctx.tenant.id),
  ])

  const billingIds = [...new Set(profiles.map((row) => row.billing_customer_id))]
  const identities = await listBillingCustomers(ctx.orgId, billingIds)
  const identityById = new Map(identities.map((row) => [row.id, row]))

  const customers: PackageFormOption[] = profiles.map((profile) => {
    const identity = identityById.get(profile.billing_customer_id)
    const label =
      [identity?.firstName, identity?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      identity?.name ||
      identity?.companyName ||
      profile.billing_customer_id
    return { value: profile.id, label }
  })

  const branches: PackageFormOption[] = branchesResult.error
    ? []
    : branchesResult.data.data
        .filter((branch) => branch.is_active)
        .map((branch) => ({ value: branch.id, label: branch.name }))

  const categoryOptions: PackageFormOption[] = categories
    .filter((category) => category.is_active && category.deleted_at === null)
    .map((category) => ({ value: category.id, label: category.name }))

  return { customers, branches, categories: categoryOptions }
}

async function listAllCustomerProfiles(tenantId: string) {
  const rows: Array<{ id: string; billing_customer_id: string }> = []
  let startingAfter: string | undefined

  for (;;) {
    const page = requireCouriersData(
      await couriersOperator.customers.list(tenantId, {
        status: 'ACTIVE',
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

async function listAllCategories(tenantId: string) {
  const rows: PackageCategory[] = []
  let startingAfter: string | undefined

  for (;;) {
    const page = requireCouriersData(
      await couriersOperator.packageCategories.list(tenantId, {
        is_active: true,
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

async function listBillingCustomers(orgId: string, ids: string[]) {
  if (ids.length === 0) return []
  const pages = []

  for (let index = 0; index < ids.length; index += PAGE_SIZE) {
    const page = await billingIntegration.customers.list(orgId, {
      ids: ids.slice(index, index + PAGE_SIZE),
      limit: PAGE_SIZE,
    })
    if (page.data) pages.push(...page.data.data)
  }

  return pages
}
