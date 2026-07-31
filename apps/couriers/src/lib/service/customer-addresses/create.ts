import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import {
  customerAddressCreateParamsSchema,
  type CustomerAddressCreateParams,
  type CustomerAddressView,
} from '@/types/customer-address'
import type { ServiceResult } from '@/types/api'

import { buildAddressData } from '../addresses/create'
import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'
import { toCustomerAddressView } from './view'

class CustomerNotFoundError extends Error {}

export async function create(
  tenantId: string,
  params: CustomerAddressCreateParams
): ServiceResult<CustomerAddressView> {
  const parsed = customerAddressCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid address.', 400)

  const input = parsed.data
  const type = input.type ?? 'DELIVERY'

  const address = await buildAddressData(tenantId, input.address)
  if (!address.ok) return address.result

  const now = nowUnixSeconds()

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Resolved through the tenant so one tenant can never attach an address
      // to another tenant's customer.
      const customer = await tx.courierCustomerProfile.findFirst({
        where: { id: input.customerId, tenantId },
        select: { id: true },
      })
      if (!customer) throw new CustomerNotFoundError()

      // The first address of a role is that role's default, so every role a
      // customer uses always resolves to exactly one address.
      const count = await tx.customerAddress.count({
        where: { tenantId, customerId: customer.id, type },
      })
      const isDefault = count === 0 || input.isDefault === true

      if (isDefault && count > 0)
        await tx.customerAddress.updateMany({
          where: { tenantId, customerId: customer.id, type, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      const createdAddress = await tx.address.create({ data: address.data })

      return tx.customerAddress.create({
        data: {
          tenantId,
          customerId: customer.id,
          addressId: createdAddress.id,
          type,
          isDefault,
          createdAt: now,
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    return ok(toCustomerAddressView(created))
  } catch (error) {
    if (error instanceof CustomerNotFoundError)
      return err('Customer not found.', 404)
    if (isUniqueConstraintError(error))
      return err('That address is already saved for this customer.', 409)

    console.error('[service.customerAddresses.create]', error)
    return err('Failed to save address.', 500)
  }
}
