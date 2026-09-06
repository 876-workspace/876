import 'server-only'

import { create876BillingServerClient } from '@876/billing/server'
import { cache } from 'react'
import { z } from 'zod'

import { getInvoiceBillingConfig } from './billing-config'

const tenantsSchema = z.array(
  z.object({ id: z.string().min(1), organizationId: z.string().nullable() })
)

/** Resolves Invoice's organization to its shared Billing workspace. */
export const resolveBillingTenantId = cache(
  async function resolveBillingTenantId(organizationId: string) {
    const { baseUrl } = getInvoiceBillingConfig()
    const internalKey = process.env.API_INTERNAL_KEY
    if (!internalKey) return null

    const billing = create876BillingServerClient({ baseUrl, internalKey })
    const result = await billing.request<unknown>({
      method: 'POST',
      path: '/internal/projections/tenants',
      body: { organizationIds: [organizationId] },
    })
    if (result.error) return null

    const parsed = tenantsSchema.safeParse(result.data)
    if (!parsed.success) return null
    return (
      parsed.data.find((tenant) => tenant.organizationId === organizationId)
        ?.id ?? null
    )
  }
)
