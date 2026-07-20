import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { CustomerLinkParams } from '@/types/customer'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/**
 * Links an EXTERNAL billing customer to an 876 consumer account, converting
 * it to a CORE_USER customer. Callers must have already verified account
 * ownership (verified email match, authenticated claim, or explicit staff
 * action) — this verb performs the registry mutation only. See
 * `.claude/rules/customer-architecture.md`.
 */
export async function link(
  tenantId: string,
  customerId: string,
  params: CustomerLinkParams
): ServiceResult<{ id: string }> {
  const userId = params.userId.trim()
  if (!userId) return err('Enter an 876 account ID.', 422)

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, customerType: true },
  })
  if (!customer) return err('Customer not found.', 404)

  if (customer.customerType === 'CORE_USER')
    return err('This customer is already linked to an 876 account.', 422)
  if (customer.customerType === 'CORE_ORGANIZATION')
    return err(
      'Organization customers cannot be linked to an 876 account.',
      422
    )

  const conflict = await prisma.customer.findFirst({
    where: { tenantId, userId, id: { not: customerId } },
    select: { id: true },
  })
  if (conflict)
    return err('This 876 account is already linked to another customer.', 409)

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        customerType: 'CORE_USER',
        userId,
        coreSyncedAt: null,
        updatedAt: nowUnixSeconds(),
      },
    })

    return ok({ id: customerId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err(
        'This 876 account is already linked to another customer.',
        409
      )

    console.error('[billing.service.customers.link]', error)
    return err('Failed to link the customer.', 500)
  }
}
