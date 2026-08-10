import { prisma } from '@/db/client'
import { Prisma } from '@/db/generated/prisma/client'

import type { AddressRow } from './addresses.serializers'

export type AddressUsage = {
  branchCount: number
  warehouseCount: number
  customerAddressCount: number
}

export async function tenantExists(tenantId: string): Promise<boolean> {
  return Boolean(await prisma.tenant.findUnique({ where: { id: tenantId } }))
}

export async function findAddress(
  tenantId: string,
  id: string
): Promise<AddressRow | null> {
  const address = await prisma.address.findFirst({ where: { tenantId, id } })
  return address as AddressRow | null
}

export async function listAddresses(options: {
  tenantId: string
  isActive?: boolean
  countryCode?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}): Promise<AddressRow[]> {
  const cursorId = options.startingAfter ?? options.endingBefore
  const anchor = cursorId ? await findAddress(options.tenantId, cursorId) : null
  if (cursorId && !anchor) return []

  const rows = await prisma.address.findMany({
    where: {
      tenantId: options.tenantId,
      ...(options.isActive === undefined ? {} : { isActive: options.isActive }),
      ...(options.countryCode ? { countryCode: options.countryCode } : {}),
      ...(anchor
        ? options.startingAfter
          ? addressesAfter(anchor)
          : addressesBefore(anchor)
        : {}),
    },
    orderBy: options.endingBefore
      ? [{ createdAt: 'asc' }, { id: 'asc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }],
    take: options.limit + 1,
  })
  return rows as AddressRow[]
}

export async function createAddress(
  data: Record<string, unknown>
): Promise<AddressRow> {
  const address = await prisma.address.create({
    data: data as Prisma.AddressUncheckedCreateInput,
  })
  return address as AddressRow
}

export async function updateAddress(options: {
  id: string
  data: Record<string, unknown>
}): Promise<AddressRow> {
  const address = await prisma.address.update({
    where: { id: options.id },
    data: options.data as Prisma.AddressUncheckedUpdateInput,
  })
  return address as AddressRow
}

export async function deleteAddressIfUnused(
  tenantId: string,
  id: string
): Promise<'not_found' | 'in_use' | 'deleted'> {
  return prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        _count: {
          select: {
            branches: true,
            warehouses: true,
            customerAddresses: true,
          },
        },
      },
    })
    if (!address) return 'not_found'
    if (
      address._count.branches > 0 ||
      address._count.warehouses > 0 ||
      address._count.customerAddresses > 0
    )
      return 'in_use'

    await tx.address.delete({ where: { id: address.id } })
    return 'deleted'
  })
}

function addressesAfter(anchor: AddressRow) {
  const createdAt = Number(anchor.createdAt)
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: anchor.id } },
    ],
  }
}

function addressesBefore(anchor: AddressRow) {
  const createdAt = Number(anchor.createdAt)
  return {
    OR: [
      { createdAt: { gt: createdAt } },
      { createdAt, id: { gt: anchor.id } },
    ],
  }
}
