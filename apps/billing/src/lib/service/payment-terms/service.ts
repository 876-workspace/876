import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { PaymentTermCreateParams } from '@/types/payment-term'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export const paymentTerms = {
  list(tenantId: string) {
    return prisma.paymentTerm.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { dueDays: 'asc' }],
    })
  },

  async create(
    tenantId: string,
    params: PaymentTermCreateParams
  ): ServiceResult<{ id: string }> {
    const now = nowUnixSeconds()

    try {
      const term = await prisma.$transaction(async (tx) => {
        if (params.isDefault)
          await tx.paymentTerm.updateMany({
            where: { tenantId, isDefault: true },
            data: { isDefault: false, updatedAt: now },
          })

        return tx.paymentTerm.create({
          data: {
            id: generateId('PaymentTerm'),
            tenantId,
            name: params.name,
            rule: params.rule,
            dueDays: params.dueDays,
            isDefault: params.isDefault,
            isSystem: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        })
      })

      return ok({ id: term.id })
    } catch (error) {
      console.error('[billing.service.payment-terms.create]', error)
      return err('Failed to create the payment term.', 500)
    }
  },
}
