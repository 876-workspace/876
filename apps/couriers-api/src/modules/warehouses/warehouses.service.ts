import { Prisma } from '@/db/generated/prisma/client'
import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import { resolveRegion } from '@/providers/platform/geo'

import { prisma } from './warehouses.repository'
import { serializeWarehouse, type WarehouseRow } from './warehouses.serializers'
import type {
  CreateWarehouseBody,
  UpdateWarehouseBody,
  Warehouse,
} from './warehouses.schemas'

const withAddress = { include: { address: true } } as const
type AddressRow = NonNullable<WarehouseRow['address']>
const missing = () =>
  new AppHttpError({
    code: 'warehouse/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })
const conflict = (message: string) =>
  new AppHttpError({ code: 'warehouse/conflict', message, httpStatus: 409 })

export async function listWarehouses(tenantId: string): Promise<Warehouse[]> {
  const rows = await prisma.warehouse.findMany({
    where: { tenantId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    ...withAddress,
  })
  return (rows as WarehouseRow[]).map(serializeWarehouse)
}

export async function retrieveWarehouse(
  tenantId: string,
  id: string
): Promise<Warehouse> {
  const row = await prisma.warehouse.findFirst({
    where: { tenantId, id },
    ...withAddress,
  })
  if (!row) throw missing()
  return serializeWarehouse(row as WarehouseRow)
}

export async function createWarehouse(
  tenantId: string,
  input: CreateWarehouseBody
): Promise<Warehouse> {
  if (!(await prisma.tenant.findUnique({ where: { id: tenantId } })))
    throw new AppHttpError({
      code: 'tenant/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })
  const address = await createAddress(tenantId, input.address)
  const now = nowUnixSeconds()
  const operatingModel = input.operating_model ?? 'OWNED'
  try {
    const row = await prisma.$transaction(async (tx) => {
      const count = await tx.warehouse.count({ where: { tenantId } })
      const isPrimary = count === 0 || input.is_primary === true
      if (isPrimary && count > 0)
        await tx.warehouse.updateMany({
          where: { tenantId, isPrimary: true },
          data: { isPrimary: false, updatedAt: now },
        })
      const createdAddress = await tx.address.create({ data: address })
      return tx.warehouse.create({
        data: {
          tenantId,
          addressId: createdAddress.id,
          name: input.name,
          operatingModel,
          agentName:
            operatingModel === 'AGENT' ? (input.agent_name ?? null) : null,
          code: input.code ?? null,
          mailboxPlacement: input.mailbox_placement ?? 'ADDRESS_LINE_2',
          mailboxPrefix: input.mailbox_prefix ?? null,
          instructions: input.instructions ?? null,
          isActive: input.is_active ?? true,
          isPrimary,
          createdAt: now,
          updatedAt: now,
        },
        ...withAddress,
      })
    })
    return serializeWarehouse(row as WarehouseRow)
  } catch (error) {
    if (isUnique(error))
      throw conflict('A warehouse with that name already exists.')
    throw error
  }
}

export async function updateWarehouse(
  tenantId: string,
  id: string,
  input: UpdateWarehouseBody
): Promise<Warehouse> {
  const current = (await prisma.warehouse.findFirst({
    where: { tenantId, id },
    ...withAddress,
  })) as WarehouseRow | null
  if (!current) throw missing()
  const address = input.address
    ? await updateAddress(current.address!, input.address)
    : undefined
  const now = nowUnixSeconds()
  const operatingModel = input.operating_model ?? current.operatingModel
  try {
    const row = await prisma.$transaction(async (tx) => {
      if (input.is_primary === true && !current.isPrimary)
        await tx.warehouse.updateMany({
          where: { tenantId, isPrimary: true },
          data: { isPrimary: false, updatedAt: now },
        })
      if (address)
        await tx.address.update({
          where: { id: current.addressId },
          data: address,
        })
      return tx.warehouse.update({
        where: { id: current.id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.operating_model === undefined
            ? {}
            : { operatingModel: input.operating_model }),
          ...(operatingModel === 'OWNED'
            ? { agentName: null }
            : input.agent_name === undefined
              ? {}
              : { agentName: input.agent_name }),
          ...(input.code === undefined ? {} : { code: input.code }),
          ...(input.mailbox_placement === undefined
            ? {}
            : { mailboxPlacement: input.mailbox_placement }),
          ...(input.mailbox_prefix === undefined
            ? {}
            : { mailboxPrefix: input.mailbox_prefix }),
          ...(input.instructions === undefined
            ? {}
            : { instructions: input.instructions }),
          ...(input.is_active === undefined
            ? {}
            : { isActive: input.is_active }),
          ...(input.is_primary === undefined
            ? {}
            : { isPrimary: input.is_primary }),
          updatedAt: now,
        },
        ...withAddress,
      })
    })
    return serializeWarehouse(row as WarehouseRow)
  } catch (error) {
    if (isUnique(error))
      throw conflict('A warehouse with that name already exists.')
    throw error
  }
}

async function createAddress(
  tenantId: string,
  address: CreateWarehouseBody['address']
) {
  const geography = await resolveRegion(
    address.country_code,
    address.region_code
  )
  if (!geography.ok) throw addressError(geography.code)
  const now = nowUnixSeconds()
  return {
    tenantId,
    name: address.name,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    countryCode: address.country_code,
    regionCode: geography.region.regionCode,
    regionName: geography.region.regionName,
    postalCode: address.postal_code ?? null,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isActive: address.is_active ?? true,
    createdAt: now,
    updatedAt: now,
  }
}

async function updateAddress(
  current: AddressRow,
  address: NonNullable<UpdateWarehouseBody['address']>
) {
  const data: Record<string, unknown> = { updatedAt: nowUnixSeconds() }
  if (address.name !== undefined) data.name = address.name
  if (address.line1 !== undefined) data.line1 = address.line1
  if (address.line2 !== undefined) data.line2 = address.line2 ?? null
  if (address.city !== undefined) data.city = address.city
  if (address.postal_code !== undefined)
    data.postalCode = address.postal_code ?? null
  if (address.latitude !== undefined) data.latitude = address.latitude ?? null
  if (address.longitude !== undefined)
    data.longitude = address.longitude ?? null
  if (address.is_active !== undefined) data.isActive = address.is_active
  if (address.country_code !== undefined || address.region_code !== undefined) {
    const geography = await resolveRegion(
      address.country_code ?? current.countryCode,
      address.region_code
    )
    if (!geography.ok) throw addressError(geography.code)
    data.countryCode = address.country_code ?? current.countryCode
    data.regionCode = geography.region.regionCode
    data.regionName = geography.region.regionName
  }
  return data
}

function addressError(code: string) {
  return new AppHttpError({
    code,
    message:
      code === 'address/geography-unavailable'
        ? 'Geographic validation is unavailable.'
        : 'Invalid address.',
    httpStatus: code === 'address/geography-unavailable' ? 503 : 422,
  })
}
function isUnique(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}
