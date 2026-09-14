import 'server-only'

import {
  create876CouriersClient,
  type CouriersClient,
  type PortalPackage,
  type PortalTenant,
  type Result,
} from '@876/couriers'

import type { PortalPackageListItem } from '@/types/package'

/**
 * Portal requests must be bound to the signed-in user's short-lived access
 * token. This client is intentionally created for the current request rather
 * than shared as an app-wide singleton.
 */
export function createPortalCouriersClient(
  accessToken: string | undefined
): CouriersClient {
  return create876CouriersClient({
    baseUrl: process.env.COURIERS_API_URL,
    apiKey: process.env.COURIERS_API_KEY,
    accessToken,
  })
}

export function requirePortalData<T>(result: Result<T>): T {
  if (result.error === null) return result.data
  throw new Error(
    `Couriers portal request failed (${result.error.code}): ${result.error.message}`
  )
}

export function isPortalNotFound(result: Result<unknown>): boolean {
  return result.error !== null && result.error.code.endsWith('/not-found')
}

export type PortalTenantView = {
  id: string
  orgId: string
  slug: string
  name: string
  mailboxPrefix: string | null
  status: 'ACTIVE'
  createdAt: number
  updatedAt: number
}

export function toPortalTenantView(tenant: PortalTenant): PortalTenantView {
  return {
    id: tenant.id,
    orgId: tenant.org_id,
    slug: tenant.slug,
    name: tenant.name,
    mailboxPrefix: tenant.mailbox_prefix,
    status: tenant.status,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  }
}

/**
 * The portal list UI deliberately has a smaller view than the operational
 * package record. Keep the session API's snake-case transport at this edge.
 */
export function toPortalPackageListItem(
  packageItem: PortalPackage
): PortalPackageListItem {
  return {
    id: packageItem.id,
    trackingNum: packageItem.tracking_num,
    status: packageItem.status,
    description: packageItem.description,
    createdAt: packageItem.created_at,
  }
}

export function toPortalPackageDetail(packageItem: PortalPackage) {
  return {
    id: packageItem.id,
    trackingNum: packageItem.tracking_num,
    status: packageItem.status,
    description: packageItem.description,
    packageType: packageItem.package_type,
    actualWeight: packageItem.actual_weight,
    chargeableWeight: packageItem.chargeable_weight,
    collectedAt: packageItem.collected_at,
    createdAt: packageItem.created_at,
    carrier: packageItem.carrier,
    branch: packageItem.branch,
    mailbox: packageItem.mailbox,
    category: packageItem.category,
  }
}

/**
 * The former datastore reader returned every package. Follow the session
 * endpoint's cursor until it is exhausted so this migration retains that
 * behavior without treating a first page as a complete result.
 */
export async function listAllPortalPackages(
  client: CouriersClient,
  tenantId: string
): Promise<Result<PortalPackage[]>> {
  const packages: PortalPackage[] = []
  let startingAfter: string | undefined

  for (;;) {
    const result = await client.portal.packages.list(tenantId, {
      limit: 100,
      ...(startingAfter === undefined ? {} : { starting_after: startingAfter }),
    })
    if (result.error !== null) return { data: null, error: result.error }

    packages.push(...result.data.data)
    const lastId = result.data.data.at(-1)?.id
    if (!result.data.has_more || lastId === undefined)
      return { data: packages, error: null }

    startingAfter = lastId
  }
}
