import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

/**
 * Structured address values from the reviewed catalog. The seed never carries
 * coordinates: `DirectoryAddress.latitude`/`longitude` stay null until a
 * trusted geocode exists, so a verified street address is still importable.
 */
export type SeedAddress = {
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string | null
  country: string
}

function addressCreateData(address: SeedAddress, now: bigint) {
  return {
    id: generateId('directoryAddress'),
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    latitude: null,
    longitude: null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Only the reviewed address fields. Coordinates are never included, so a
 * trusted geocode added later by an operator survives a reseed.
 */
function addressUpdateData(address: SeedAddress, now: bigint) {
  return {
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    updatedAt: now,
  }
}

function omitNullFields<T extends Record<string, unknown>>(
  fields: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null)
  ) as Partial<T>
}

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
  website: string | null
  generalPhone: string | null
  supportPhone: string | null
  supportEmail: string | null
  complaintsEmail: string | null
  contactUrl: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
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
  const identityFields = {
    name: data.name,
    clearingSystem: data.clearingSystem,
    institutionType: data.institutionType,
  }
  const enrichmentFields = {
    shortName: data.shortName,
    website: data.website,
    generalPhone: data.generalPhone,
    supportPhone: data.supportPhone,
    supportEmail: data.supportEmail,
    complaintsEmail: data.complaintsEmail,
    contactUrl: data.contactUrl,
    sourceUrl: data.sourceUrl,
    sourceAsOf: data.sourceAsOf,
    lastVerifiedAt: data.lastVerifiedAt,
  }

  if (existing) {
    const row = await prisma.bank.update({
      where: { id: existing.id },
      data: {
        ...identityFields,
        ...omitNullFields(enrichmentFields),
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
      ...identityFields,
      ...enrichmentFields,
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
  rawAddress: string | null
  contactNumber: string | null
  operatingHours: string | null
  branchType: string | null
  status: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
  address: SeedAddress | null
}): Promise<'created' | 'updated' | 'deleted'> {
  const existing = await prisma.bankBranch.findUnique({
    where: {
      bankId_transitNumber: {
        bankId: data.bankId,
        transitNumber: data.transitNumber,
      },
    },
    select: { id: true, deletedAt: true, addressId: true },
  })
  const now = BigInt(nowUnixSeconds())
  const identityFields = {
    name: data.name,
    routingNumber: data.routingNumber,
  }
  const enrichmentFields = {
    rawAddress: data.rawAddress,
    contactNumber: data.contactNumber,
    operatingHours: data.operatingHours,
    branchType: data.branchType,
    status: data.status,
    sourceUrl: data.sourceUrl,
    sourceAsOf: data.sourceAsOf,
    lastVerifiedAt: data.lastVerifiedAt,
  }

  if (existing) {
    if (existing.deletedAt !== null) return 'deleted'

    await prisma.bankBranch.update({
      where: { id: existing.id },
      data: {
        ...identityFields,
        ...omitNullFields(enrichmentFields),
        updatedAt: now,
        // An address absent from the catalog is left alone rather than cleared:
        // the snapshot is not authoritative for data an operator enriched.
        ...(data.address
          ? existing.addressId
            ? {
                directoryAddress: {
                  update: addressUpdateData(data.address, now),
                },
              }
            : {
                directoryAddress: {
                  create: addressCreateData(data.address, now),
                },
              }
          : {}),
      },
    })
    return 'updated'
  }

  await prisma.bankBranch.create({
    data: {
      id: generateId('bankBranch'),
      bank: { connect: { id: data.bankId } },
      transitNumber: data.transitNumber,
      ...identityFields,
      ...enrichmentFields,
      createdAt: now,
      updatedAt: now,
      ...(data.address
        ? { directoryAddress: { create: addressCreateData(data.address, now) } }
        : {}),
    },
    select: { id: true },
  })
  return 'created'
}

export async function upsertSeedCreditUnion(data: {
  code: string
  name: string
  shortName: string | null
  headquarters: string | null
  website: string | null
  generalPhone: string | null
  supportPhone: string | null
  supportEmail: string | null
  complaintsEmail: string | null
  contactUrl: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
}) {
  let existing = await prisma.creditUnion.findUnique({
    where: { code: data.code },
    select: { id: true, deletedAt: true },
  })
  if (!existing) {
    const codelessMatches = await prisma.creditUnion.findMany({
      where: {
        code: null,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { id: true, deletedAt: true },
    })
    if (codelessMatches.length > 1)
      throw new Error(
        `credit union code ${data.code} matches multiple codeless credit unions by name`
      )
    existing = codelessMatches[0] ?? null
  }
  const now = BigInt(nowUnixSeconds())
  const identityFields = {
    name: data.name,
  }
  const enrichmentFields = {
    shortName: data.shortName,
    headquarters: data.headquarters,
    website: data.website,
    generalPhone: data.generalPhone,
    supportPhone: data.supportPhone,
    supportEmail: data.supportEmail,
    complaintsEmail: data.complaintsEmail,
    contactUrl: data.contactUrl,
    sourceUrl: data.sourceUrl,
    sourceAsOf: data.sourceAsOf,
    lastVerifiedAt: data.lastVerifiedAt,
  }

  if (existing) {
    const row = await prisma.creditUnion.update({
      where: { id: existing.id },
      data: {
        code: data.code,
        ...identityFields,
        ...omitNullFields(enrichmentFields),
        updatedAt: now,
      },
      select: { id: true, deletedAt: true },
    })
    return { id: row.id, deleted: row.deletedAt !== null, created: false }
  }

  const row = await prisma.creditUnion.create({
    data: {
      id: generateId('creditUnion'),
      code: data.code,
      ...identityFields,
      ...enrichmentFields,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  })

  return { id: row.id, deleted: false, created: true }
}

export async function upsertSeedCreditUnionBranch(data: {
  creditUnionId: string
  code: string
  name: string
  rawAddress: string | null
  contactNumber: string | null
  email: string | null
  operatingHours: string | null
  branchType: string | null
  status: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
  address: SeedAddress | null
}): Promise<'created' | 'updated' | 'deleted'> {
  let existing = await prisma.creditUnionBranch.findUnique({
    where: { code: data.code },
    select: { id: true, deletedAt: true, addressId: true },
  })
  if (!existing) {
    const codelessMatches = await prisma.creditUnionBranch.findMany({
      where: {
        creditUnionId: data.creditUnionId,
        code: null,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { id: true, deletedAt: true, addressId: true },
    })
    if (codelessMatches.length > 1)
      throw new Error(
        `credit union branch code ${data.code} matches multiple codeless credit union branches by name`
      )
    existing = codelessMatches[0] ?? null
  }
  const now = BigInt(nowUnixSeconds())
  const identityFields = {
    name: data.name,
  }
  const enrichmentFields = {
    rawAddress: data.rawAddress,
    contactNumber: data.contactNumber,
    email: data.email,
    operatingHours: data.operatingHours,
    branchType: data.branchType,
    status: data.status,
    sourceUrl: data.sourceUrl,
    sourceAsOf: data.sourceAsOf,
    lastVerifiedAt: data.lastVerifiedAt,
  }

  if (existing) {
    await prisma.creditUnionBranch.update({
      where: { id: existing.id },
      data: {
        code: data.code,
        ...identityFields,
        ...omitNullFields(enrichmentFields),
        updatedAt: now,
        ...(data.address
          ? existing.addressId
            ? {
                directoryAddress: {
                  update: addressUpdateData(data.address, now),
                },
              }
            : {
                directoryAddress: {
                  create: addressCreateData(data.address, now),
                },
              }
          : {}),
      },
    })
    return existing.deletedAt !== null ? 'deleted' : 'updated'
  }

  await prisma.creditUnionBranch.create({
    data: {
      id: generateId('creditUnionBranch'),
      creditUnion: { connect: { id: data.creditUnionId } },
      code: data.code,
      ...identityFields,
      ...enrichmentFields,
      createdAt: now,
      updatedAt: now,
      ...(data.address
        ? { directoryAddress: { create: addressCreateData(data.address, now) } }
        : {}),
    },
    select: { id: true },
  })
  return 'created'
}
