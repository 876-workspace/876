import { prisma } from '@/db/client'

import { Prisma } from '@/db/generated/prisma/client'

import type { WarehouseRow } from './warehouses.serializers'
import type {
  CreateWarehouseBody,
  UpdateWarehouseBody,
} from './warehouses.schemas'

const withAddress = { include: { address: true } } as const

export async function listTenantWarehouses(
  tenantId: string
): Promise<WarehouseRow[]> {
  const rows = await prisma.warehouse.findMany({
    where: { tenantId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    ...withAddress,
  })
  return rows as WarehouseRow[]
}

export async function findTenantWarehouseById(
  tenantId: string,
  id: string
): Promise<WarehouseRow | null> {
  const row = await prisma.warehouse.findFirst({
    where: { tenantId, id },
    ...withAddress,
  })
  return row as WarehouseRow | null
}

export async function tenantExists(tenantId: string): Promise<boolean> {
  return Boolean(await prisma.tenant.findUnique({ where: { id: tenantId } }))
}

export async function createWarehouseWithAddress(options: {
  tenantId: string
  input: CreateWarehouseBody
  address: Record<string, unknown>
  operatingModel: 'OWNED' | 'AGENT'
  now: number
}): Promise<WarehouseRow> {
  const warehouse = await prisma.$transaction(async (tx) => {
    const count = await tx.warehouse.count({
      where: { tenantId: options.tenantId },
    })
    const isPrimary = count === 0 || options.input.is_primary === true

    if (isPrimary && count > 0) {
      await tx.warehouse.updateMany({
        where: { tenantId: options.tenantId, isPrimary: true },
        data: { isPrimary: false, updatedAt: options.now },
      })
    }

    const createdAddress = await tx.address.create({
      data: options.address as Prisma.AddressCreateInput,
    })

    return tx.warehouse.create({
      data: {
        tenantId: options.tenantId,
        addressId: createdAddress.id,
        name: options.input.name,
        operatingModel: options.operatingModel,
        agentName:
          options.operatingModel === 'AGENT'
            ? (options.input.agent_name ?? null)
            : null,
        code: options.input.code ?? null,
        mailboxPlacement: options.input.mailbox_placement ?? 'ADDRESS_LINE_2',
        mailboxPrefix: options.input.mailbox_prefix ?? null,
        instructions: options.input.instructions ?? null,
        isActive: options.input.is_active ?? true,
        isPrimary,
        createdAt: options.now,
        updatedAt: options.now,
      },
      ...withAddress,
    })
  })

  return warehouse as WarehouseRow
}

export async function updateWarehouseWithAddress(options: {
  tenantId: string
  current: WarehouseRow
  input: UpdateWarehouseBody
  address?: Record<string, unknown>
  operatingModel: 'OWNED' | 'AGENT'
  now: number
}): Promise<WarehouseRow> {
  const warehouse = await prisma.$transaction(async (tx) => {
    if (options.input.is_primary === true && !options.current.isPrimary) {
      await tx.warehouse.updateMany({
        where: { tenantId: options.tenantId, isPrimary: true },
        data: { isPrimary: false, updatedAt: options.now },
      })
    }

    if (options.address) {
      await tx.address.update({
        where: { id: options.current.addressId },
        data: options.address as Prisma.AddressUpdateInput,
      })
    }

    return tx.warehouse.update({
      where: { id: options.current.id },
      data: {
        ...(options.input.name === undefined
          ? {}
          : { name: options.input.name }),
        ...(options.input.operating_model === undefined
          ? {}
          : { operatingModel: options.input.operating_model }),
        ...(options.operatingModel === 'OWNED'
          ? { agentName: null }
          : options.input.agent_name === undefined
            ? {}
            : { agentName: options.input.agent_name }),
        ...(options.input.code === undefined
          ? {}
          : { code: options.input.code }),
        ...(options.input.mailbox_placement === undefined
          ? {}
          : { mailboxPlacement: options.input.mailbox_placement }),
        ...(options.input.mailbox_prefix === undefined
          ? {}
          : { mailboxPrefix: options.input.mailbox_prefix }),
        ...(options.input.instructions === undefined
          ? {}
          : { instructions: options.input.instructions }),
        ...(options.input.is_active === undefined
          ? {}
          : { isActive: options.input.is_active }),
        ...(options.input.is_primary === undefined
          ? {}
          : { isPrimary: options.input.is_primary }),
        updatedAt: options.now,
      },
      ...withAddress,
    })
  })

  return warehouse as WarehouseRow
}
