import { prisma } from './packages.repository'
import { AppHttpError } from '@/platform/errors'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
} from '@/platform/timestamps'
import type {
  CreatePackageBody,
  ListPackagesQuery,
  Package,
  UpdatePackageBody,
} from './packages.schemas'
const missing = () =>
  new AppHttpError({
    code: 'package/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })
export async function listPackages(tenantId: string, query: ListPackagesQuery) {
  const rows = await prisma.package.findMany({
    where: {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customer_id ? { customerId: query.customer_id } : {}),
      ...(query.branch_id ? { branchId: query.branch_id } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
  })
  return {
    data: rows.slice(0, query.limit).map(serialize),
    hasMore: rows.length > query.limit,
  }
}
export async function retrievePackage(
  tenantId: string,
  id: string
): Promise<Package> {
  const row = await prisma.package.findFirst({ where: { tenantId, id } })
  if (!row) throw missing()
  return serialize(row)
}
export async function createPackage(
  tenantId: string,
  input: CreatePackageBody
): Promise<Package> {
  const now = nowUnixSeconds()
  return serialize(
    await prisma.package.create({
      data: {
        tenantId,
        customerId: input.customer_id,
        branchId: input.branch_id ?? null,
        mailboxId: input.mailbox_id ?? null,
        trackingNum: input.tracking_num ?? null,
        status: input.status ?? 'PRE_ALERT',
        packageType: input.package_type ?? 'CARTON',
        description: input.description ?? null,
        quantity: input.quantity ?? 1,
        actualWeight: input.actual_weight ?? null,
        createdAt: now,
        updatedAt: now,
      },
    })
  )
}
export async function updatePackage(
  tenantId: string,
  id: string,
  input: UpdatePackageBody
): Promise<Package> {
  await retrievePackage(tenantId, id)
  const data = {
    ...(input.branch_id === undefined ? {} : { branchId: input.branch_id }),
    ...(input.mailbox_id === undefined ? {} : { mailboxId: input.mailbox_id }),
    ...(input.tracking_num === undefined
      ? {}
      : { trackingNum: input.tracking_num }),
    ...(input.status === undefined
      ? {}
      : {
          status: input.status,
          ...(input.status === 'COLLECTED'
            ? { collectedAt: nowUnixSeconds() }
            : {}),
        }),
    ...(input.package_type === undefined
      ? {}
      : { packageType: input.package_type }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
    ...(input.actual_weight === undefined
      ? {}
      : { actualWeight: input.actual_weight }),
    updatedAt: nowUnixSeconds(),
  }
  return serialize(await prisma.package.update({ where: { id }, data }))
}
function serialize(row: any): Package {
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
