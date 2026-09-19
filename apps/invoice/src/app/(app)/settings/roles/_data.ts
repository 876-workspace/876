import 'server-only'

import { cache } from 'react'

import { create876BillingServerClient } from '@876/billing/server'
import type { Member, Role } from '@876/billing'

import { getBilling } from '@/lib/clients/billing'
import { getInvoiceBillingConfig } from '@/lib/clients/billing-config'
import { resolveBillingTenantId } from '@/lib/clients/billing-tenants'

export const loadRoles = cache(async function loadRoles(organizationId: string) {
  const billing = await getBilling(organizationId)
  const result = await billing.roles.list()
  return { roles: result.data?.data ?? [], error: result.error }
})

export const loadRole = cache(async function loadRole(
  organizationId: string,
  roleId: string
): Promise<{ role: Role | null; error: { code: string; message: string } | null }> {
  const billing = await getBilling(organizationId)
  const result = await billing.roles.retrieve(roleId)
  return { role: result.data ?? null, error: result.error }
})

/**
 * The finance-workspace grants behind one role.
 *
 * Read through the typed server projection rather than the tenant client: the
 * roster joins identity data, so it is an internal-key route. Returned as a
 * value — a role card must still render its permissions when the roster is
 * unavailable.
 */
export const loadFinanceMembers = cache(async function loadFinanceMembers(
  organizationId: string
): Promise<{ members: Member[]; error: { code: string; message: string } | null }> {
  const tenantId = await resolveBillingTenantId(organizationId)
  if (!tenantId)
    return {
      members: [],
      error: {
        code: 'invoice/workspace-unresolved',
        message: 'The finance workspace could not be resolved.',
      },
    }

  const { baseUrl } = getInvoiceBillingConfig()
  const internalKey = process.env.API_INTERNAL_KEY
  if (!internalKey)
    return {
      members: [],
      error: {
        code: 'invoice/internal-key-missing',
        message: 'Workspace members could not be loaded.',
      },
    }

  const result = await create876BillingServerClient({
    baseUrl,
    internalKey,
  }).members.list(tenantId)

  return { members: result.data ?? [], error: result.error }
})
