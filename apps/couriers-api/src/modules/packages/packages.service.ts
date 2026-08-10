import { AppHttpError } from '@/platform/errors'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
} from '@/platform/timestamps'

import * as repo from './packages.repository'
import type {
  CreatePackageBody,
  ListPackagesQuery,
  Package,
  PortalPackage,
  UpdatePackageBody,
} from './packages.schemas'

const missing = (resource = 'package') =>
  new AppHttpError({
    code: `${resource}/not-found`,
    message: 'Not found.',
    httpStatus: 404,
  })

export async function listPackages(tenantId: string, query: ListPackagesQuery) {
  const rows = await repo.listTenantPackages({ tenantId, query })
  const page = rows.slice(0, query.limit)
  return {
    data: (query.ending_before ? page.reverse() : page).map(serialize),
    hasMore: rows.length > query.limit,
  }
}

export async function retrievePackage(
  tenantId: string,
  id: string
): Promise<Package> {
  const row = await repo.findTenantPackageById(tenantId, id)
  if (!row) throw missing()
  return serialize(row)
}

/** Retrieve a package only when it belongs to the caller's customer profile. */
export async function retrieveCustomerPackage(
  tenantId: string,
  customerId: string,
  id: string
): Promise<Package> {
  const row = await repo.findTenantCustomerPackageById({
    tenantId,
    customerId,
    id,
  })
  if (!row) throw missing()
  return serialize(row)
}

/** Session-safe package detail, with only relations needed by the owner UI. */
export async function retrieveCustomerPortalPackage(
  tenantId: string,
  customerId: string,
  id: string
): Promise<PortalPackage> {
  const row = await repo.findTenantCustomerPackageDetailById({
    tenantId,
    customerId,
    id,
  })
  if (!row) throw missing()
  return serializePortalPackage(row)
}

export async function createPackage(
  tenantId: string,
  input: CreatePackageBody
): Promise<Package> {
  await validatePackageReferences(tenantId, input)
  return serialize(
    await repo.createTenantPackage({ tenantId, input, now: nowUnixSeconds() })
  )
}

export async function updatePackage(
  tenantId: string,
  id: string,
  input: UpdatePackageBody
): Promise<Package> {
  await retrievePackage(tenantId, id)
  await validatePackageReferences(tenantId, input)
  return serialize(
    await repo.updateTenantPackage({ id, input, now: nowUnixSeconds() })
  )
}

async function validatePackageReferences(
  tenantId: string,
  input:
    | Pick<CreatePackageBody, 'customer_id' | 'branch_id' | 'mailbox_id'>
    | Pick<UpdatePackageBody, 'branch_id' | 'mailbox_id'>
): Promise<void> {
  const checks = await Promise.all([
    'customer_id' in input && input.customer_id
      ? repo.findTenantCustomerById(tenantId, input.customer_id)
      : undefined,
    typeof input.branch_id === 'string'
      ? repo.findTenantBranchById(tenantId, input.branch_id)
      : undefined,
    typeof input.mailbox_id === 'string'
      ? repo.findTenantMailboxById(tenantId, input.mailbox_id)
      : undefined,
  ])

  if (checks[0] === null) throw missing('customer')
  if (checks[1] === null) throw missing('branch')
  if (checks[2] === null) throw missing('mailbox')
}

function serialize(row: {
  id: string
  tenantId: string
  customerId: string
  branchId: string | null
  mailboxId: string | null
  trackingNum: string | null
  status:
    | 'PRE_ALERT'
    | 'RECEIVED'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'READY_FOR_PICKUP'
    | 'COLLECTED'
    | 'UNCLAIMED'
  packageType: 'CARTON' | 'ENVELOPE' | 'BAG' | 'PALLET' | 'OTHER'
  description: string | null
  quantity: number
  actualWeight: number | null
  collectedAt: number | bigint | null
  createdAt: number | bigint
  updatedAt: number | bigint
}): Package {
  return {
    object: 'package',
    id: row.id,
    tenant_id: row.tenantId,
    customer_id: row.customerId,
    branch_id: row.branchId,
    mailbox_id: row.mailboxId,
    tracking_num: row.trackingNum,
    status: row.status,
    package_type: row.packageType,
    description: row.description,
    quantity: row.quantity,
    actual_weight: row.actualWeight,
    collected_at: nullableFromDbUnixSeconds(row.collectedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

function serializePortalPackage(row: {
  id: string
  tenantId: string
  customerId: string
  branchId: string | null
  mailboxId: string | null
  trackingNum: string | null
  status:
    | 'PRE_ALERT'
    | 'RECEIVED'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'READY_FOR_PICKUP'
    | 'COLLECTED'
    | 'UNCLAIMED'
  packageType: 'CARTON' | 'ENVELOPE' | 'BAG' | 'PALLET' | 'OTHER'
  description: string | null
  quantity: number
  actualWeight: number | null
  chargeableWeight?: number | null
  collectedAt: number | bigint | null
  createdAt: number | bigint
  updatedAt: number | bigint
  carrier?: { id: string; name: string } | null
  branch?: { id: string; name: string } | null
  mailbox?: { id: string; number: string } | null
}): PortalPackage {
  return {
    ...serialize(row),
    chargeable_weight: row.chargeableWeight ?? null,
    carrier: row.carrier ?? null,
    branch: row.branch ?? null,
    mailbox: row.mailbox ?? null,
  }
}
