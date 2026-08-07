import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type { AddressRow } from './addresses.serializers'

/** Every query against `addresses`. */

const SELECT = {
  id: true,
  userId: true,
  organizationId: true,
  type: true,
  label: true,
  line1: true,
  line2: true,
  city: true,
  regionId: true,
  countryCode: true,
  postalCode: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const

export function findById(addressId: string): Promise<AddressRow | null> {
  return prisma.address.findUnique({ where: { id: addressId }, select: SELECT })
}

export function listByUser(userId: string): Promise<AddressRow[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: SELECT,
  })
}

export function listByOrganization(
  organizationId: string
): Promise<AddressRow[]> {
  return prisma.address.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: SELECT,
  })
}

export function create(
  data: Prisma.AddressUncheckedCreateInput
): Promise<AddressRow> {
  return prisma.address.create({ data, select: SELECT })
}

/** Returns null when the row is gone, so the caller can answer 404. */
export async function update(
  addressId: string,
  data: Prisma.AddressUncheckedUpdateInput
): Promise<AddressRow | null> {
  const exists = await prisma.address.findUnique({
    where: { id: addressId },
    select: { id: true },
  })
  if (!exists) return null

  return prisma.address.update({
    where: { id: addressId },
    data,
    select: SELECT,
  })
}

export async function remove(addressId: string): Promise<boolean> {
  const result = await prisma.address.deleteMany({ where: { id: addressId } })
  return result.count > 0
}
