import { prisma } from '@/db/client'
import { Prisma } from '@/db/generated/prisma/client'

import type { AddressCreateData, AddressUpdateData } from '@/modules/addresses'

import type { CustomerAddressRow } from './customer-addresses.serializers'
import type {
  CreateCustomerAddressBody,
  CustomerAddressType,
  ListCustomerAddressesQuery,
  UpdateCustomerAddressBody,
} from './customer-addresses.schemas'

const withAddress = { include: { address: true } } as const

export async function listCustomerAddresses(options: {
  tenantId: string
  customerId: string
  query: ListCustomerAddressesQuery
}): Promise<CustomerAddressRow[]> {
  const cursorId = options.query.starting_after ?? options.query.ending_before
  const anchor = cursorId
    ? await findCustomerAddress({
        tenantId: options.tenantId,
        customerId: options.customerId,
        id: cursorId,
        type: options.query.type,
      })
    : null
  if (cursorId && !anchor) return []

  const rows = await prisma.customerAddress.findMany({
    where: {
      tenantId: options.tenantId,
      customerId: options.customerId,
      ...(options.query.type ? { type: options.query.type } : {}),
      ...(anchor
        ? options.query.starting_after
          ? customerAddressesAfter(anchor)
          : customerAddressesBefore(anchor)
        : {}),
    },
    orderBy: options.query.ending_before
      ? [{ isDefault: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: options.query.limit + 1,
    ...withAddress,
  })
  return rows as CustomerAddressRow[]
}

export async function findCustomerAddress(options: {
  tenantId: string
  customerId: string
  id: string
  type?: CustomerAddressType
}): Promise<CustomerAddressRow | null> {
  const row = await prisma.customerAddress.findFirst({
    where: {
      tenantId: options.tenantId,
      customerId: options.customerId,
      id: options.id,
      ...(options.type ? { type: options.type } : {}),
    },
    ...withAddress,
  })
  return row as CustomerAddressRow | null
}

export async function createCustomerAddress(options: {
  tenantId: string
  customerId: string
  input: CreateCustomerAddressBody
  address: AddressCreateData
  now: number
}): Promise<CustomerAddressRow> {
  const type = options.input.type ?? 'DELIVERY'
  const row = await prisma.$transaction(async (tx) => {
    const count = await tx.customerAddress.count({
      where: {
        tenantId: options.tenantId,
        customerId: options.customerId,
        type,
      },
    })
    const isDefault = count === 0 || options.input.is_default === true
    if (isDefault && count > 0) {
      await tx.customerAddress.updateMany({
        where: {
          tenantId: options.tenantId,
          customerId: options.customerId,
          type,
          isDefault: true,
        },
        data: { isDefault: false, updatedAt: options.now },
      })
    }

    const address = await tx.address.create({
      data: options.address as Prisma.AddressUncheckedCreateInput,
    })
    return tx.customerAddress.create({
      data: {
        tenantId: options.tenantId,
        customerId: options.customerId,
        addressId: address.id,
        type,
        isDefault,
        createdAt: options.now,
        updatedAt: options.now,
      },
      ...withAddress,
    })
  })
  return row as CustomerAddressRow
}

export async function updateCustomerAddress(options: {
  tenantId: string
  current: CustomerAddressRow
  input: UpdateCustomerAddressBody
  address?: AddressUpdateData
  now: number
}): Promise<CustomerAddressRow> {
  const nextType = options.input.type ?? options.current.type
  const typeChanged = nextType !== options.current.type
  const shouldReplaceCurrentDefault =
    options.current.isDefault &&
    (typeChanged || options.input.is_default === false)

  const row = await prisma.$transaction(async (tx) => {
    if (shouldReplaceCurrentDefault) {
      const successor = await tx.customerAddress.findFirst({
        where: {
          tenantId: options.tenantId,
          customerId: options.current.customerId,
          type: options.current.type,
          id: { not: options.current.id },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      })
      if (successor) {
        await tx.customerAddress.update({
          where: { id: successor.id },
          data: { isDefault: true, updatedAt: options.now },
        })
      }
    }

    const peers = await tx.customerAddress.count({
      where: {
        tenantId: options.tenantId,
        customerId: options.current.customerId,
        type: nextType,
        id: { not: options.current.id },
      },
    })
    const isDefault =
      peers === 0 ||
      options.input.is_default === true ||
      (!typeChanged &&
        options.input.is_default === undefined &&
        options.current.isDefault)

    if (isDefault && peers > 0) {
      await tx.customerAddress.updateMany({
        where: {
          tenantId: options.tenantId,
          customerId: options.current.customerId,
          type: nextType,
          isDefault: true,
          id: { not: options.current.id },
        },
        data: { isDefault: false, updatedAt: options.now },
      })
    }

    if (options.address) {
      await tx.address.update({
        where: { id: options.current.addressId },
        data: options.address as Prisma.AddressUncheckedUpdateInput,
      })
    }

    return tx.customerAddress.update({
      where: { id: options.current.id },
      data: { type: nextType, isDefault, updatedAt: options.now },
      ...withAddress,
    })
  })
  return row as CustomerAddressRow
}

export async function deleteCustomerAddress(options: {
  tenantId: string
  customerId: string
  id: string
  now: number
}): Promise<{ id: string; addressId: string } | null> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.customerAddress.findFirst({
      where: {
        tenantId: options.tenantId,
        customerId: options.customerId,
        id: options.id,
      },
      select: {
        id: true,
        customerId: true,
        addressId: true,
        type: true,
        isDefault: true,
      },
    })
    if (!current) return null

    await tx.customerAddress.delete({ where: { id: current.id } })

    if (current.isDefault) {
      const successor = await tx.customerAddress.findFirst({
        where: {
          tenantId: options.tenantId,
          customerId: current.customerId,
          type: current.type,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      })
      if (successor) {
        await tx.customerAddress.update({
          where: { id: successor.id },
          data: { isDefault: true, updatedAt: options.now },
        })
      }
    }

    return { id: current.id, addressId: current.addressId }
  })
}

function customerAddressesAfter(anchor: CustomerAddressRow) {
  const createdAt = Number(anchor.createdAt)
  return {
    OR: [
      ...(anchor.isDefault ? [{ isDefault: false }] : []),
      { isDefault: anchor.isDefault, createdAt: { gt: createdAt } },
      {
        isDefault: anchor.isDefault,
        createdAt,
        id: { gt: anchor.id },
      },
    ],
  }
}

function customerAddressesBefore(anchor: CustomerAddressRow) {
  const createdAt = Number(anchor.createdAt)
  return {
    OR: [
      ...(!anchor.isDefault ? [{ isDefault: true }] : []),
      { isDefault: anchor.isDefault, createdAt: { lt: createdAt } },
      {
        isDefault: anchor.isDefault,
        createdAt,
        id: { lt: anchor.id },
      },
    ],
  }
}
