import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { apiError } from '@876/core/api'

import { service } from '@/lib/service'

type PlatformTenant = NonNullable<
  Awaited<ReturnType<typeof service.tenants.retrieveBySlug>>
>

type InternalAdminAccess =
  | { tenant: PlatformTenant; response: null }
  | { tenant: null; response: Response }

type InternalServiceAccess =
  | { authorized: true; response: null }
  | { authorized: false; response: Response }

/** Compares a presented key against the configured secret in constant time. */
function matchesInternalKey(presented: string, expected: string): boolean {
  const presentedDigest = createHash('sha256').update(presented).digest()
  const expectedDigest = createHash('sha256').update(expected).digest()

  return timingSafeEqual(presentedDigest, expectedDigest)
}

/**
 * Authorizes a server-to-server request onto the platform Billing tenant.
 *
 * The caller must present `x-internal-key` matching `BILLING_INTERNAL_KEY`.
 * An empty or missing configured key rejects every request, mirroring the
 * core API's `AdminDep` semantics. This guard is the only entry point for
 * the Console -> Billing mirror surface under `/api/admin/*`.
 */
export async function requireInternalAdmin(
  request: Request
): Promise<InternalAdminAccess> {
  const serviceAccess = requireInternalService(request, 'admin')
  if (serviceAccess.response)
    return { tenant: null, response: serviceAccess.response }

  const tenantSlug = process.env.BILLING_PLATFORM_TENANT_SLUG
  if (!tenantSlug) {
    return {
      tenant: null,
      response: apiError('The Billing platform tenant is not configured.', {
        status: 503,
      }),
    }
  }

  const tenant = await service.tenants.retrieveBySlug(tenantSlug)
  if (!tenant || tenant.status !== 'ACTIVE') {
    return {
      tenant: null,
      response: apiError('The Billing platform tenant is unavailable.', {
        status: 503,
      }),
    }
  }

  return { tenant, response: null }
}

/** Authorizes internal service work that is not scoped to one tenant. */
export function requireInternalService(
  request: Request,
  scope = 'service'
): InternalServiceAccess {
  const expected = process.env.BILLING_INTERNAL_KEY
  if (!expected)
    return {
      authorized: false,
      response: apiError(`Internal ${scope} access is disabled.`, {
        status: 503,
      }),
    }

  const presented = request.headers.get('x-internal-key')
  if (!presented || !matchesInternalKey(presented, expected))
    return {
      authorized: false,
      response: apiError('Unauthorized.', { status: 401 }),
    }

  return { authorized: true, response: null }
}
