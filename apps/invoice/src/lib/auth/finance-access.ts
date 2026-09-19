import 'server-only'

import { create876BillingServerClient } from '@876/billing/server'
import { cache } from 'react'

import { getInvoiceBillingConfig } from '@/lib/clients/billing-config'
import { resolveBillingTenantId } from '@/lib/clients/billing-tenants'

import { getInvoiceContextResult } from './context'

export type InvoiceFinanceViewer = {
  tenantId: string
  permissions: string[]
}

export type InvoiceFinanceAccessOutcome =
  | { status: 'ok'; viewer: InvoiceFinanceViewer }
  | { status: 'unavailable'; code: string }

type InvoiceFinancePermission =
  | 'currencies:read'
  | 'currencies:write'
  | 'payments:read'
  | 'payments:write'
  | 'taxes:read'
  | 'taxes:write'
  | 'sales:read'
  | 'sales:write'

/**
 * Resolves a member's finance role once per request. All arguments are
 * primitives deliberately: React.cache compares them with Object.is.
 */
export const resolveInvoiceFinanceAccess = cache(
  async function resolveInvoiceFinanceAccess(
    organizationId: string,
    userId: string,
    organizationRole: 'super-admin' | 'admin' | 'staff'
  ): Promise<InvoiceFinanceAccessOutcome> {
    const tenantId = await resolveBillingTenantId(organizationId)
    if (!tenantId)
      return { status: 'unavailable', code: 'billing/tenant-unresolved' }

    const internalKey = process.env.API_INTERNAL_KEY
    if (!internalKey)
      return { status: 'unavailable', code: 'billing/internal-key-unavailable' }

    const { baseUrl } = getInvoiceBillingConfig()
    const billing = create876BillingServerClient({ baseUrl, internalKey })
    const result = await billing.members.resolve({
      tenantId,
      userId,
      organizationRole,
    })
    if (result.error) return { status: 'unavailable', code: result.error.code }

    return {
      status: 'ok',
      viewer: {
        tenantId,
        permissions:
          result.data?.status === 'ACTIVE' ? result.data.permissions : [],
      },
    }
  }
)

function response(status: 401 | 403 | 503, code: string, message: string) {
  return Response.json({ data: null, error: { code, message } }, { status })
}

/** API-only guard for finance role and member mutations; never redirects. */
export async function requireFinanceRoleManager(organizationId: string) {
  return requireFinanceManager(organizationId, 'roles:write', 'roles')
}

/** API-only guard for changing explicit finance member grants. */
export async function requireFinanceMemberManager(organizationId: string) {
  return requireFinanceManager(organizationId, 'members:write', 'members')
}

/** API-only guard for a product route that exposes a Billing finance resource. */
export async function requireInvoiceFinancePermission(
  organizationId: string,
  permission: InvoiceFinancePermission
) {
  return requireFinanceManager(organizationId, permission, 'settings')
}

async function requireFinanceManager(
  organizationId: string,
  permission: 'roles:write' | 'members:write' | InvoiceFinancePermission,
  subject: 'roles' | 'members' | 'settings' | 'sales'
) {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out')
    return {
      viewer: null,
      response: response(
        401,
        'invoice/unauthorized',
        'Authentication is required.'
      ),
    }
  if (context.status === 'unavailable')
    return {
      viewer: null,
      response: response(
        503,
        'invoice/access-unavailable',
        'Access could not be verified. Try again.'
      ),
    }
  if (context.status !== 'ok' || context.context.orgId !== organizationId)
    return {
      viewer: null,
      response: response(
        403,
        'invoice/forbidden',
        'You do not have permission to manage finance access.'
      ),
    }

  const outcome = await resolveInvoiceFinanceAccess(
    organizationId,
    context.context.userId,
    context.context.role
  )
  if (outcome.status === 'unavailable')
    return {
      viewer: null,
      response: response(
        503,
        'invoice/access-unavailable',
        'Access could not be verified. Try again.'
      ),
    }
  if (!outcome.viewer.permissions.includes(permission))
    return {
      viewer: null,
      response: response(
        403,
        'invoice/forbidden',
        `You do not have permission to manage finance ${subject}.`
      ),
    }

  return { viewer: outcome.viewer, response: null }
}
