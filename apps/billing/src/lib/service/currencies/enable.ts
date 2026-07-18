import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { TenantCurrencyEnableParams } from '@/types/currency'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Enables a globally-supported currency for a tenant. */
export async function enable(
  tenantId: string,
  params: TenantCurrencyEnableParams
): ServiceResult<{ currency: string }> {
  const currency = await prisma.currency.findFirst({
    where: { code: params.currency, isActive: true },
    select: { code: true },
  })
  if (!currency) return err('This currency is not supported.', 422)

  const now = nowUnixSeconds()
  await prisma.tenantCurrency.upsert({
    where: {
      tenantId_currencyCode: { tenantId, currencyCode: currency.code },
    },
    create: {
      tenantId,
      currencyCode: currency.code,
      isDefault: false,
      isEnabled: true,
      createdAt: now,
      updatedAt: now,
    },
    update: { isEnabled: true, updatedAt: now },
  })

  return ok({ currency: currency.code })
}
