import 'server-only'

import { getCrmBillingIntegration } from '@/lib/876/billing-integration'
import { prisma, type CustomerProfileStatus } from '@/lib/db'
import type { CrmCustomer } from '@/types/crm'

export async function list(params: {
  organizationId: string
  status?: CustomerProfileStatus
  limit?: number
}): Promise<CrmCustomer[]> {
  const profiles = await prisma.customerProfile.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(params.limit ?? 50, 100),
  })

  if (profiles.length === 0) return []

  const finance = await getCrmBillingIntegration()
  const registry = await finance.customers.list(params.organizationId, {
    ids: profiles.map((profile) => profile.billingCustomerId),
    limit: Math.min(profiles.length, 100),
  })
  if (registry.error)
    return profiles.map((profile) => ({ profile, customer: null }))

  const byId = new Map(registry.data.data.map((customer) => [customer.id, customer]))
  return profiles.map((profile) => ({
    profile,
    customer: byId.get(profile.billingCustomerId) ?? null,
  }))
}
