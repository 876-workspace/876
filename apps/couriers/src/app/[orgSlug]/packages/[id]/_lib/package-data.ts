import 'server-only'

import { cache } from 'react'

import { getManageContext } from '@/lib/auth/manage-context'
import { isCouriersNotFound, requireCouriersData } from '@/lib/couriers'
import { billingIntegration } from '@/lib/services/billing'
import { couriersOperator } from '@/lib/services/couriers'

export const resolvePackage = cache(async (orgSlug: string, id: string) => {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const packageResult = await couriersOperator.packages.retrieve(ctx.tenant.id, id)
  if (isCouriersNotFound(packageResult)) return null
  const pkg = requireCouriersData(packageResult)

  const [customerResult, branchResult] = await Promise.all([
    couriersOperator.customers.retrieve(ctx.tenant.id, pkg.customer_id),
    pkg.branch_id
      ? couriersOperator.branches.retrieve(ctx.tenant.id, pkg.branch_id)
      : null,
  ])

  const customer = customerResult.error ? null : customerResult.data
  const branch = branchResult?.error ? null : (branchResult?.data ?? null)
  const identity = customer
    ? await billingIntegration.customers.retrieve(
        ctx.orgId,
        customer.billing_customer_id
      )
    : null
  const registry = identity?.data ?? null
  const customerName =
    [registry?.firstName, registry?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    registry?.name ||
    registry?.companyName ||
    customer?.billing_customer_id ||
    pkg.customer_id

  return { pkg, customer, customerName, branch }
})

export const resolvePackageTitle = cache(
  async (orgSlug: string, id: string) => {
    const resolved = await resolvePackage(orgSlug, id)
    return resolved?.pkg.tracking_num ?? resolved?.pkg.id ?? null
  }
)
