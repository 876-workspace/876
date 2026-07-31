import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Prisma } from '@/lib/db'
import {
  customerAddressUpdateParamsSchema,
  type CustomerAddressUpdateParams,
  type CustomerAddressView,
} from '@/types/customer-address'
import type { ServiceResult } from '@/types/api'

import { buildAddressUpdateData } from '../addresses/update'
import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'
import { toCustomerAddressView } from './view'

export async function update(
  tenantId: string,
  id: string,
  params: CustomerAddressUpdateParams
): ServiceResult<CustomerAddressView> {
  const parsed = customerAddressUpdateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid address.', 400)

  const input = parsed.data

  const current = await prisma.customerAddress.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      customerId: true,
      addressId: true,
      type: true,
      isDefault: true,
      address: { select: { countryCode: true, regionCode: true } },
    },
  })
  if (!current) return err('Address not found.', 404)

  let addressData: Prisma.AddressUncheckedUpdateInput | undefined
  if (input.address) {
    const built = await buildAddressUpdateData(current.address, input.address)
    if (!built.ok) return built.result
    addressData = built.data
  }

  const now = nowUnixSeconds()
  const nextType = input.type ?? current.type
  const typeChanged = nextType !== current.type

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Moving an address to another role re-evaluates the invariant on both
      // sides: the role it leaves must not be left without a default, and the
      // role it joins must not end up with two.
      if (typeChanged && current.isDefault) {
        const successor = await tx.customerAddress.findFirst({
          where: {
            tenantId,
            customerId: current.customerId,
            type: current.type,
            id: { not: current.id },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        })
        if (successor)
          await tx.customerAddress.update({
            where: { id: successor.id },
            data: { isDefault: true, updatedAt: now },
          })
      }

      const peers = await tx.customerAddress.count({
        where: {
          tenantId,
          customerId: current.customerId,
          type: nextType,
          id: { not: current.id },
        },
      })
      // Sole address of its role is always that role's default.
      const isDefault =
        peers === 0 ||
        input.isDefault === true ||
        (!typeChanged && input.isDefault === undefined && current.isDefault)

      if (isDefault && peers > 0)
        await tx.customerAddress.updateMany({
          where: {
            tenantId,
            customerId: current.customerId,
            type: nextType,
            isDefault: true,
            id: { not: current.id },
          },
          data: { isDefault: false, updatedAt: now },
        })

      if (addressData)
        await tx.address.update({
          where: { id: current.addressId },
          data: addressData,
        })

      return tx.customerAddress.update({
        where: { id: current.id },
        data: { type: nextType, isDefault, updatedAt: now },
        include: { address: true },
      })
    })

    return ok(toCustomerAddressView(updated))
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('That address is already saved for this customer.', 409)

    console.error('[service.customerAddresses.update]', error)
    return err('Failed to update address.', 500)
  }
}
