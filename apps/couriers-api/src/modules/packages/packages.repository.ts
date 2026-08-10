import { prisma } from '@/db/client'

import type {
  CreatePackageBody,
  ListPackagesQuery,
  UpdatePackageBody,
} from './packages.schemas'

export async function listTenantPackages(options: {
  tenantId: string
  query: ListPackagesQuery
}) {
  const cursorId = options.query.starting_after ?? options.query.ending_before
  const anchor = cursorId
    ? await findTenantPackageById(options.tenantId, cursorId)
    : null

  if (cursorId && !anchor) return []

  return prisma.package.findMany({
    where: {
      tenantId: options.tenantId,
      ...(options.query.status ? { status: options.query.status } : {}),
      ...(options.query.customer_id
        ? { customerId: options.query.customer_id }
        : {}),
      ...(options.query.branch_id ? { branchId: options.query.branch_id } : {}),
      ...(anchor
        ? options.query.starting_after
          ? packagesAfter(anchor)
          : packagesBefore(anchor)
        : {}),
    },
    orderBy: options.query.ending_before
      ? [{ createdAt: 'asc' }, { id: 'asc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }],
    take: options.query.limit + 1,
  })
}

export function findTenantPackageById(tenantId: string, id: string) {
  return prisma.package.findFirst({ where: { tenantId, id } })
}

export function findTenantCustomerById(tenantId: string, id: string) {
  return prisma.courierCustomerProfile.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function findTenantBranchById(tenantId: string, id: string) {
  return prisma.branch.findFirst({ where: { tenantId, id } })
}

export function findTenantMailboxById(tenantId: string, id: string) {
  return prisma.mailbox.findFirst({ where: { tenantId, id } })
}

export function createTenantPackage(options: {
  tenantId: string
  input: CreatePackageBody
  now: number
}) {
  return prisma.package.create({
    data: {
      tenantId: options.tenantId,
      customerId: options.input.customer_id,
      branchId: options.input.branch_id ?? null,
      mailboxId: options.input.mailbox_id ?? null,
      trackingNum: options.input.tracking_num ?? null,
      status: options.input.status ?? 'PRE_ALERT',
      packageType: options.input.package_type ?? 'CARTON',
      description: options.input.description ?? null,
      quantity: options.input.quantity ?? 1,
      actualWeight: options.input.actual_weight ?? null,
      createdAt: options.now,
      updatedAt: options.now,
    },
  })
}

export function updateTenantPackage(options: {
  id: string
  input: UpdatePackageBody
  now: number
}) {
  return prisma.package.update({
    where: { id: options.id },
    data: {
      ...(options.input.branch_id === undefined
        ? {}
        : { branchId: options.input.branch_id }),
      ...(options.input.mailbox_id === undefined
        ? {}
        : { mailboxId: options.input.mailbox_id }),
      ...(options.input.tracking_num === undefined
        ? {}
        : { trackingNum: options.input.tracking_num }),
      ...(options.input.status === undefined
        ? {}
        : {
            status: options.input.status,
            ...(options.input.status === 'COLLECTED'
              ? { collectedAt: options.now }
              : {}),
          }),
      ...(options.input.package_type === undefined
        ? {}
        : { packageType: options.input.package_type }),
      ...(options.input.description === undefined
        ? {}
        : { description: options.input.description }),
      ...(options.input.quantity === undefined
        ? {}
        : { quantity: options.input.quantity }),
      ...(options.input.actual_weight === undefined
        ? {}
        : { actualWeight: options.input.actual_weight }),
      updatedAt: options.now,
    },
  })
}

function packagesAfter(anchor: { createdAt: number; id: string }) {
  return {
    OR: [
      { createdAt: { lt: anchor.createdAt } },
      { createdAt: anchor.createdAt, id: { lt: anchor.id } },
    ],
  }
}

function packagesBefore(anchor: { createdAt: number; id: string }) {
  return {
    OR: [
      { createdAt: { gt: anchor.createdAt } },
      { createdAt: anchor.createdAt, id: { gt: anchor.id } },
    ],
  }
}
