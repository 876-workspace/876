import 'server-only'

import { cache } from 'react'

import { $876, get876Client } from '@/lib/876'
import { getManageContext } from '@/lib/auth/manage-context'
import {
  isCouriersNotFound,
  requireCouriersData,
  toCustomerView,
} from '@/lib/couriers'

/** Resolve the data shared by the customer detail header and its actions. */
export const resolveCustomer = cache(async (orgSlug: string, id: string) => {
  const [ctx, request876] = await Promise.all([
    getManageContext(orgSlug),
    get876Client(),
  ])
  if (!ctx?.tenant) return null

  const customerResult = await $876.couriers.customers.retrieve(
    ctx.tenant.id,
    id
  )
  if (isCouriersNotFound(customerResult)) return null

  const profile = toCustomerView(requireCouriersData(customerResult))

  const [registry, mailboxesResult, branchResult] = await Promise.all([
    request876.billing.customers.retrieve(
      ctx.tenant.orgId,
      profile.billingCustomerId
    ),
    request876.couriers.customers.mailboxes.list(ctx.tenant.id, profile.id),
    profile.branchId
      ? $876.couriers.branches.retrieve(ctx.tenant.id, profile.branchId)
      : null,
  ])

  const mailboxes = requireCouriersData(mailboxesResult).data
  const branch = branchResult?.error ? null : (branchResult?.data ?? null)

  return {
    profile,
    identity: registry.data,
    mailbox: mailboxes.find((item) => item.is_primary) ?? mailboxes[0],
    branch,
  }
})

/** Lightweight title resolver for generateMetadata — avoids mailboxes/branch. */
export const resolveCustomerTitle = cache(async (orgSlug: string, id: string) => {
  const [ctx, request876] = await Promise.all([
    getManageContext(orgSlug),
    get876Client(),
  ])
  if (!ctx?.tenant) return null
  const customerResult = await $876.couriers.customers.retrieve(ctx.tenant.id, id)
  if (isCouriersNotFound(customerResult)) return null
  const profile = toCustomerView(requireCouriersData(customerResult))
  const registry = await request876.billing.customers.retrieve(
    ctx.tenant.orgId,
    profile.billingCustomerId
  )
  return registry.data?.name ?? profile.billingCustomerId
})
