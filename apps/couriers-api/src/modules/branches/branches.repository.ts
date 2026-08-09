import { prisma } from '@/db/client'

import { Prisma } from '@/db/generated/prisma/client'

import type { BranchRow } from './branches.serializers'
import type { CreateBranchBody, UpdateBranchBody } from './branches.schemas'

const withAddress = { include: { address: true } } as const

export async function tenantExists(tenantId: string): Promise<boolean> {
  return Boolean(await prisma.tenant.findUnique({ where: { id: tenantId } }))
}

export async function findBranch(
  tenantId: string,
  id: string
): Promise<BranchRow | null> {
  const branch = await prisma.branch.findFirst({
    where: { tenantId, id },
    ...withAddress,
  })
  return branch as BranchRow | null
}

export async function listBranches(options: {
  tenantId: string
  isActive?: boolean
  limit: number
  startingAfter?: string
  endingBefore?: string
}): Promise<BranchRow[]> {
  const cursorId = options.startingAfter ?? options.endingBefore
  const anchor = cursorId ? await findBranch(options.tenantId, cursorId) : null

  if (cursorId && !anchor) return []

  const cursorWhere = anchor
    ? options.startingAfter
      ? branchesAfter(anchor)
      : branchesBefore(anchor)
    : {}
  const rows = await prisma.branch.findMany({
    where: {
      tenantId: options.tenantId,
      ...(options.isActive === undefined ? {} : { isActive: options.isActive }),
      ...cursorWhere,
    },
    orderBy: options.endingBefore
      ? [{ isDefault: 'asc' }, { name: 'desc' }, { id: 'desc' }]
      : [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    take: options.limit + 1,
    ...withAddress,
  })
  return rows as BranchRow[]
}

export function countBranches(tenantId: string): Promise<number> {
  return prisma.branch.count({ where: { tenantId } })
}

export async function createBranchWithAddress(options: {
  tenantId: string
  input: CreateBranchBody
  address: Record<string, unknown>
  now: number
}): Promise<BranchRow> {
  const branch = await prisma.$transaction(async (tx) => {
    const count = await tx.branch.count({
      where: { tenantId: options.tenantId },
    })
    const isDefault = count === 0 || options.input.is_default === true

    if (isDefault && count > 0) {
      await tx.branch.updateMany({
        where: { tenantId: options.tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: options.now },
      })
    }

    const createdAddress = await tx.address.create({
      data: options.address as Prisma.AddressCreateInput,
    })

    return tx.branch.create({
      data: {
        tenantId: options.tenantId,
        addressId: createdAddress.id,
        name: options.input.name,
        phone: options.input.phone ?? null,
        isDefault,
        isActive: options.input.is_active ?? true,
        settings: options.input.settings as Prisma.InputJsonObject | undefined,
        createdAt: options.now,
        updatedAt: options.now,
      },
      ...withAddress,
    })
  })

  return branch as BranchRow
}

export async function updateBranchWithAddress(options: {
  tenantId: string
  current: BranchRow
  input: UpdateBranchBody
  address?: Record<string, unknown>
  now: number
}): Promise<BranchRow> {
  const branch = await prisma.$transaction(async (tx) => {
    if (options.input.is_default === true && !options.current.isDefault) {
      await tx.branch.updateMany({
        where: { tenantId: options.tenantId, isDefault: true },
        data: { isDefault: false, updatedAt: options.now },
      })
    }

    if (options.address) {
      await tx.address.update({
        where: { id: options.current.addressId },
        data: options.address as Prisma.AddressUpdateInput,
      })
    }

    return tx.branch.update({
      where: { id: options.current.id },
      data: {
        ...(options.input.name === undefined
          ? {}
          : { name: options.input.name }),
        ...(options.input.phone === undefined
          ? {}
          : { phone: options.input.phone }),
        ...(options.input.is_default === undefined
          ? {}
          : { isDefault: options.input.is_default }),
        ...(options.input.is_active === undefined
          ? {}
          : { isActive: options.input.is_active }),
        ...(options.input.settings === undefined
          ? {}
          : {
              settings: options.input.settings as Prisma.InputJsonObject,
            }),
        updatedAt: options.now,
      },
      ...withAddress,
    })
  })

  return branch as BranchRow
}

function branchesAfter(anchor: BranchRow) {
  return {
    OR: [
      ...(anchor.isDefault ? [{ isDefault: false }] : []),
      { isDefault: anchor.isDefault, name: { gt: anchor.name } },
      {
        isDefault: anchor.isDefault,
        name: anchor.name,
        id: { gt: anchor.id },
      },
    ],
  }
}

function branchesBefore(anchor: BranchRow) {
  return {
    OR: [
      ...(!anchor.isDefault ? [{ isDefault: true }] : []),
      { isDefault: anchor.isDefault, name: { lt: anchor.name } },
      {
        isDefault: anchor.isDefault,
        name: anchor.name,
        id: { lt: anchor.id },
      },
    ],
  }
}
