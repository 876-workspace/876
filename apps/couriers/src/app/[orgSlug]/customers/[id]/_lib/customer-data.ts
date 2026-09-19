import 'server-only'

import { cache } from 'react'

import { couriersOperator, getCouriers } from '@/lib/clients/couriers'
import { billingIntegration } from '@/lib/clients/billing'
import { getManageContext } from '@/lib/auth/manage-context'
import {
  isCouriersNotFound,
  requireCouriersData,
  toCustomerView,
} from '@/lib/couriers'

/** Resolve the data shared by the customer detail header and its actions. */
export const resolveCustomer = cache(async (orgSlug: string, id: string) => {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null
  const $876 = await getCouriers()

  const customerResult = await $876.customers.retrieve(id)
  if (isCouriersNotFound(customerResult)) return null

  const profile = toCustomerView(requireCouriersData(customerResult))

  const [registry, mailboxesResult, branchResult] = await Promise.all([
    billingIntegration.customers.retrieve(
      ctx.tenant.orgId,
      profile.billingCustomerId
    ),
    couriersOperator.customers.mailboxes.list(ctx.tenant.id, profile.id),
    profile.branchId ? $876.branches.retrieve(profile.branchId) : null,
  ])

  const mailboxes = requireCouriersData(mailboxesResult).data
  const branch = branchResult?.error ? null : (branchResult?.data ?? null)

  return {
    profile,
    identity: registry.data,
    displayName: registry.data?.name ?? profile.billingCustomerId,
    isActive: registry.data
      ? registry.data.status === 'ACTIVE'
      : profile.status === 'ACTIVE',
    mailbox: mailboxes.find((item) => item.is_primary) ?? mailboxes[0],
    branch,
  }
})

/** Lightweight title resolver for generateMetadata — avoids mailboxes/branch. */
export const resolveCustomerTitle = cache(
  async (orgSlug: string, id: string) => {
    const ctx = await getManageContext(orgSlug)
    if (!ctx?.tenant) return null
    const $876 = await getCouriers()
    const customerResult = await $876.customers.retrieve(id)
    if (isCouriersNotFound(customerResult)) return null
    const profile = toCustomerView(requireCouriersData(customerResult))
    const registry = await billingIntegration.customers.retrieve(
      ctx.tenant.orgId,
      profile.billingCustomerId
    )
    return registry.data?.name ?? profile.billingCustomerId
  }
)
