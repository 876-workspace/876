import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { TenantCurrencyEnableParams } from '@/types/currency'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Sets one enabled currency as the tenant default. */
export async function setDefault(
  tenantId: string,
  params: TenantCurrencyEnableParams
): ServiceResult<{ currency: string }> {
  const currency = await prisma.currency.findFirst({
    where: { code: params.currency, isActive: true },
    select: { code: true },
  })
  if (!currency) return err('This currency is not supported.', 422)

  const now = nowUnixSeconds()
  await prisma.$transaction(async (tx) => {
    await tx.tenantCurrency.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false, updatedAt: now },
    })
    await tx.tenantCurrency.upsert({
      where: {
        tenantId_currencyCode: { tenantId, currencyCode: currency.code },
      },
      create: {
        tenantId,
        currencyCode: currency.code,
        isDefault: true,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      update: { isDefault: true, isEnabled: true, updatedAt: now },
    })
    await tx.tenant.update({
      where: { id: tenantId },
      data: { defaultCurrency: currency.code, updatedAt: now },
    })
  })

  return ok({ currency: currency.code })
}
