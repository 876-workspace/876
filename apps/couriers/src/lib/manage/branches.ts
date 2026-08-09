import 'server-only'

import { after } from 'next/server'

import { service } from '@/lib/service'
import type { Branch } from '@876/couriers/admin'
import type { BranchView } from '@/types/branch'

/**
 * Translate the wire resource into the view this app has always returned from
 * `/api/manage/branches`. The browser client is typed against `BranchView`, so
 * handing the snake_case API resource straight to it would break every reader
 * silently — the route's JSON body is not type-checked against that client.
 */
export function toBranchView(branch: Branch): BranchView {
  return {
    id: branch.id,
    tenantId: branch.tenant_id,
    addressId: branch.address_id,
    orgLocationId: branch.org_location_id,
    name: branch.name,
    phone: branch.phone,
    isDefault: branch.is_default,
    isActive: branch.is_active,
    settings: branch.settings,
    createdAt: branch.created_at,
    updatedAt: branch.updated_at,
    address: {
      id: branch.address.id,
      tenantId: branch.address.tenant_id,
      name: branch.address.name,
      line1: branch.address.line1,
      line2: branch.address.line2,
      city: branch.address.city,
      regionCode: branch.address.region_code,
      regionName: branch.address.region_name,
      countryCode: branch.address.country_code,
      postalCode: branch.address.postal_code,
      latitude: branch.address.latitude,
      longitude: branch.address.longitude,
      isActive: branch.address.is_active,
      createdAt: branch.address.created_at,
      updatedAt: branch.address.updated_at,
    },
  }
}

/**
 * Translate a Couriers API error code into the HTTP status this app answers
 * with. The service returns `httpStatus` only to its own error middleware — a
 * client-facing error body carries `code` and `message` and nothing else — so
 * the status has to be re-derived from the code on this side of the wire.
 */
export function statusForCouriersError(code: string): number {
  if (code.endsWith('/not-found')) return 404
  if (code.endsWith('/conflict')) return 409
  if (code === 'address/geography-unavailable') return 503
  return 422
}

/**
 * Mirror a committed branch into the core organization's location registry.
 *
 * The couriers service owns the branch; the identity API owns the
 * organization's canonical locations. Nothing in `apps/couriers-api` writes to
 * core, so the mirror stays here, on the same terms it had when the write went
 * through the local service layer: scheduled with `after()` so a slow identity
 * API never delays the response, never throwing, and idempotent because the
 * branch id doubles as the core location `code`. The settings page still runs
 * `orgLocations.reconcile` opportunistically, which repairs any mirror this
 * pass loses.
 */
export function scheduleBranchMirror(orgId: string, branch: BranchView): void {
  after(() =>
    service.orgLocations.sync(orgId, {
      kind: 'branch',
      id: branch.id,
      orgLocationId: branch.orgLocationId,
      name: branch.name,
      phone: branch.phone,
      isActive: branch.isActive,
      isDefaultForKind: branch.isDefault,
      address: branch.address,
    })
  )
}
