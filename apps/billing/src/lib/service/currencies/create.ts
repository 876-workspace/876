import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { CurrencyCreateParams } from '@/types/currency'
import type { ServiceResult } from '@/types/api'

import { ok } from '../result'

/** Creates a global currency and enables it for a tenant. */
export async function create(
  tenantId: string,
  params: CurrencyCreateParams
): ServiceResult<{ currency: string }> {
  const code = params.code.toUpperCase()
  const now = nowUnixSeconds()

  const currency = await prisma.currency.upsert({
    where: { code },
    create: {
      code,
      name: params.name,
      symbol: params.symbol,
      decimalPlaces: params.decimalPlaces,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      name: params.name,
      symbol: params.symbol,
      decimalPlaces: params.decimalPlaces,
      updatedAt: now,
    },
  })

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
