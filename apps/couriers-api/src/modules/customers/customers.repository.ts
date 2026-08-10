import { prisma } from '@/db/client'

import type {
  CreateCustomerBody,
  ListCustomersQuery,
  MailboxCreateBody,
  MailboxUpdateBody,
  UpdateCustomerBody,
} from './customers.schemas'

export async function listTenantCustomers(options: {
  tenantId: string
  query: ListCustomersQuery
}) {
  const cursorId = options.query.starting_after ?? options.query.ending_before
  const anchor = cursorId
    ? await findTenantCustomerById(options.tenantId, cursorId)
    : null

  if (cursorId && !anchor) return []

  return prisma.courierCustomerProfile.findMany({
    where: {
      tenantId: options.tenantId,
      deletedAt: null,
      ...(options.query.status ? { status: options.query.status } : {}),
      ...(options.query.branch_id ? { branchId: options.query.branch_id } : {}),
      ...(anchor
        ? options.query.starting_after
          ? customersAfter(anchor)
          : customersBefore(anchor)
        : {}),
    },
    orderBy: options.query.ending_before
      ? [{ createdAt: 'asc' }, { id: 'asc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }],
    take: options.query.limit + 1,
  })
}

export function findTenantCustomerById(tenantId: string, id: string) {
  return prisma.courierCustomerProfile.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function findTenantCustomerByUserId(tenantId: string, userId: string) {
  return prisma.courierCustomerProfile.findFirst({
    where: { tenantId, userId, deletedAt: null },
  })
}

export async function enrollTenantCustomer(options: {
  tenantId: string
  billingCustomerId: string
  userId: string | null
  branchId: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  trn: string | null
  isCommercial: boolean
  now: number
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.courierCustomerProfile.findFirst({
      where: {
        tenantId: options.tenantId,
        ...(options.userId === null
          ? { billingCustomerId: options.billingCustomerId }
          : { userId: options.userId }),
      },
    })
    if (existing && existing.billingCustomerId !== options.billingCustomerId)
      return { kind: 'conflict' as const }

    const profile = existing
      ? await tx.courierCustomerProfile.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
            updatedAt: options.now,
          },
        })
      : await tx.courierCustomerProfile.create({
          data: {
            tenantId: options.tenantId,
            billingCustomerId: options.billingCustomerId,
            userId: options.userId,
            branchId: options.branchId,
            status: options.status,
            trn: options.trn,
            isCommercial: options.isCommercial,
            firstSeenAt: options.now,
            createdAt: options.now,
            updatedAt: options.now,
          },
        })

    const mailbox = await tx.mailbox.findFirst({
      where: {
        tenantId: options.tenantId,
        customerId: profile.id,
        isPrimary: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    if (mailbox) return { kind: 'success' as const, profile, mailbox }

    const tenant = await tx.tenant.findUnique({
      where: { id: options.tenantId },
      select: { mailboxPrefix: true },
    })
    if (!tenant) return { kind: 'tenant_missing' as const }
    const prefix = tenant.mailboxPrefix?.trim().toUpperCase() ?? ''
    const count = await tx.mailbox.count({
      where: { tenantId: options.tenantId },
    })
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const number = `${prefix}${String(1001 + count + attempt).padStart(4, '0')}`
      const occupied = await tx.mailbox.findUnique({
        where: {
          mailboxes_tenant_id_number_key: {
            tenantId: options.tenantId,
            number,
          },
        },
        select: { id: true },
      })
      if (occupied) continue
      const createdMailbox = await tx.mailbox.create({
        data: {
          tenantId: options.tenantId,
          customerId: profile.id,
          number,
          isPrimary: true,
          createdAt: options.now,
          updatedAt: options.now,
        },
      })
      return { kind: 'success' as const, profile, mailbox: createdMailbox }
    }
    return { kind: 'mailbox_unavailable' as const }
  })
}

export async function tenantExists(tenantId: string): Promise<boolean> {
  return Boolean(await prisma.tenant.findUnique({ where: { id: tenantId } }))
}

export function findTenantBranchById(tenantId: string, id: string) {
  return prisma.branch.findFirst({ where: { tenantId, id } })
}

export function findTenantDefaultBranch(tenantId: string) {
  return prisma.branch.findFirst({
    where: { tenantId, isDefault: true },
    select: { id: true },
  })
}

export function createTenantCustomer(options: {
  tenantId: string
  input: CreateCustomerBody
  branchId: string | null
  now: number
}) {
  return prisma.courierCustomerProfile.create({
    data: {
      tenantId: options.tenantId,
      billingCustomerId: (options.input as unknown as { billing_customer_id: string }).billing_customer_id,
      userId: null,
      branchId: options.branchId,
      status: options.input.status ?? 'ACTIVE',
      trn: options.input.trn ?? null,
      isCommercial: options.input.is_commercial ?? false,
      firstSeenAt: options.now,
      createdAt: options.now,
      updatedAt: options.now,
    },
  })
}

export function updateTenantCustomer(options: {
  id: string
  input: UpdateCustomerBody
  now: number
}) {
  return prisma.courierCustomerProfile.update({
    where: { id: options.id },
    data: {
      ...(options.input.branch_id === undefined
        ? {}
        : { branchId: options.input.branch_id }),
      ...(options.input.status === undefined
        ? {}
        : { status: options.input.status }),
      ...(options.input.trn === undefined ? {} : { trn: options.input.trn }),
      ...(options.input.is_commercial === undefined
        ? {}
        : { isCommercial: options.input.is_commercial }),
      updatedAt: options.now,
    },
  })
}

export function softDeleteTenantCustomer(options: {
  id: string
  now: number
  deletedBy?: string | null
  deletionReason?: string | null
}) {
  return prisma.courierCustomerProfile.update({
    where: { id: options.id },
    data: {
      deletedAt: options.now,
      deletedBy: options.deletedBy ?? null,
      deletionReason: options.deletionReason ?? null,
      updatedAt: options.now,
    },
  })
}

export function listTenantCustomerMailboxes(
  tenantId: string,
  customerId: string
) {
  return prisma.mailbox.findMany({
    where: { tenantId, customerId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
}

export function createTenantMailbox(options: {
  tenantId: string
  customerId: string
  input: MailboxCreateBody
  now: number
}) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.mailbox.count({
      where: { tenantId: options.tenantId, customerId: options.customerId },
    })
    const isPrimary = count === 0 || options.input.is_primary === true

    if (isPrimary && count > 0) {
      await tx.mailbox.updateMany({
        where: {
          tenantId: options.tenantId,
          customerId: options.customerId,
          isPrimary: true,
        },
        data: { isPrimary: false, updatedAt: options.now },
      })
    }

    return tx.mailbox.create({
      data: {
        tenantId: options.tenantId,
        customerId: options.customerId,
        number: options.input.number.toUpperCase(),
        isPrimary,
        createdAt: options.now,
        updatedAt: options.now,
      },
    })
  })
}

export function findTenantCustomerMailboxById(options: {
  tenantId: string
  customerId: string
  id: string
}) {
  return prisma.mailbox.findFirst({
    where: {
      id: options.id,
      tenantId: options.tenantId,
      customerId: options.customerId,
    },
  })
}

export function updateTenantMailbox(options: {
  tenantId: string
  customerId: string
  id: string
  input: MailboxUpdateBody
  currentIsPrimary: boolean
  now: number
}) {
  return prisma.$transaction(async (tx) => {
    if (options.input.is_primary && !options.currentIsPrimary) {
      await tx.mailbox.updateMany({
        where: {
          tenantId: options.tenantId,
          customerId: options.customerId,
          isPrimary: true,
        },
        data: { isPrimary: false, updatedAt: options.now },
      })
    }

    return tx.mailbox.update({
      where: { id: options.id },
      data: { isPrimary: options.input.is_primary, updatedAt: options.now },
    })
  })
}

function customersAfter(anchor: { createdAt: number; id: string }) {
  return {
    OR: [
      { createdAt: { lt: anchor.createdAt } },
      { createdAt: anchor.createdAt, id: { lt: anchor.id } },
    ],
  }
}

function customersBefore(anchor: { createdAt: number; id: string }) {
  return {
    OR: [
      { createdAt: { gt: anchor.createdAt } },
      { createdAt: anchor.createdAt, id: { gt: anchor.id } },
    ],
  }
}
