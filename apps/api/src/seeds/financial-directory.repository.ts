import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

export function findSeedCountry(countryCode: string) {
  return prisma.country.findUnique({
    where: { code: countryCode },
    select: { code: true },
  })
}

export async function upsertSeedBank(data: {
  countryCode: string
  bankCode: string
  name: string
  shortName: string | null
  clearingSystem: string | null
  institutionType: string
}) {
  const existing = await prisma.bank.findUnique({
    where: {
      countryCode_bankCode: {
        countryCode: data.countryCode,
        bankCode: data.bankCode,
      },
    },
    select: { id: true, deletedAt: true },
  })
  const now = BigInt(nowUnixSeconds())

  if (existing) {
    const row = await prisma.bank.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        shortName: data.shortName,
        clearingSystem: data.clearingSystem,
        institutionType: data.institutionType,
        updatedAt: now,
      },
      select: { id: true, deletedAt: true },
    })
    return { id: row.id, deleted: row.deletedAt !== null, created: false }
  }

  const row = await prisma.bank.create({
    data: {
      id: generateId('bank'),
      countryCode: data.countryCode,
      bankCode: data.bankCode,
      name: data.name,
      shortName: data.shortName,
      clearingSystem: data.clearingSystem,
      institutionType: data.institutionType,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  })

  return { id: row.id, deleted: false, created: true }
}

export async function upsertSeedBranch(data: {
  bankId: string
  transitNumber: string
  routingNumber: string
  name: string
}): Promise<'created' | 'updated' | 'deleted'> {
  const existing = await prisma.bankBranch.findUnique({
    where: {
      bankId_transitNumber: {
        bankId: data.bankId,
        transitNumber: data.transitNumber,
      },
    },
    select: { id: true, deletedAt: true },
  })
  const now = BigInt(nowUnixSeconds())

  if (existing) {
    if (existing.deletedAt !== null) return 'deleted'

    await prisma.bankBranch.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        routingNumber: data.routingNumber,
        updatedAt: now,
      },
    })
    return 'updated'
  }

  await prisma.bankBranch.create({
    data: {
      id: generateId('bankBranch'),
      bankId: data.bankId,
      name: data.name,
      transitNumber: data.transitNumber,
      routingNumber: data.routingNumber,
      addressId: null,
      contactNumber: null,
      operatingHours: null,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  })
  return 'created'
}
