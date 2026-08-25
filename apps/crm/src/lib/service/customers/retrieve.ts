import 'server-only'

import { getCrmBillingIntegration } from '@/lib/876/billing-integration'
import { prisma } from '@/lib/db'
import type { CrmCustomer } from '@/types/crm'

export async function retrieve(params: {
  organizationId: string
  id: string
}): Promise<CrmCustomer | null> {
  const profile = await prisma.customerProfile.findFirst({
    where: {
      id: params.id,
      organizationId: params.organizationId,
      deletedAt: null,
    },
  })
  if (!profile) return null

  const finance = await getCrmBillingIntegration()
  const registry = await finance.customers.list(params.organizationId, {
    ids: [profile.billingCustomerId],
    limit: 1,
  })

  return {
    profile,
    customer: registry.error ? null : (registry.data.data[0] ?? null),
  }
}
