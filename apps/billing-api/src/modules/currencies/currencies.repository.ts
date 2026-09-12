import { prisma } from '@/db/client'

export async function enabledCurrencyExists(
  tenantId: string,
  currencyCode: string
): Promise<boolean> {
  const currency = await prisma.tenantCurrency.findFirst({
    where: { tenantId, currencyCode, isEnabled: true },
    select: { currencyCode: true },
  })

  return currency !== null
}

export function findEnabledCurrencyRow(tenantId: string, currencyCode: string) {
  return prisma.tenantCurrency.findFirst({
    where: { tenantId, currencyCode, isEnabled: true },
    select: {
      currencyCode: true,
      currency: { select: { decimalPlaces: true } },
    },
  })
}

export function listCurrencyRows(tenantId: string) {
  return prisma.tenantCurrency.findMany({
    where: { tenantId, isEnabled: true },
    include: { currency: true },
    orderBy: [{ isDefault: 'desc' }, { currencyCode: 'asc' }],
  })
}

export async function enableCurrencyRow(
  tenantId: string,
  currencyCode: string,
  now: number
): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const currency = await transaction.currency.findFirst({
      where: { code: currencyCode, isActive: true },
      select: { code: true },
    })
    if (!currency) return false
    await transaction.tenantCurrency.upsert({
      where: { tenantId_currencyCode: { tenantId, currencyCode } },
      create: {
        tenantId,
        currencyCode,
        isDefault: false,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      update: { isEnabled: true, updatedAt: now },
    })
    return true
  })
}

export function upsertCurrencyRow(data: {
  tenantId: string
  code: string
  name: string
  symbol: string | null
  decimalPlaces: number
  now: number
}) {
  return prisma.$transaction(async (transaction) => {
    const currency = await transaction.currency.upsert({
      where: { code: data.code },
      create: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: data.decimalPlaces,
        isActive: true,
        createdAt: data.now,
        updatedAt: data.now,
      },
      update: {
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: data.decimalPlaces,
        isActive: true,
        updatedAt: data.now,
      },
    })
    await transaction.tenantCurrency.upsert({
      where: {
        tenantId_currencyCode: {
          tenantId: data.tenantId,
          currencyCode: currency.code,
        },
      },
      create: {
        tenantId: data.tenantId,
        currencyCode: currency.code,
        isDefault: false,
        isEnabled: true,
        createdAt: data.now,
        updatedAt: data.now,
      },
      update: { isEnabled: true, updatedAt: data.now },
    })
    return currency.code
  })
}

export async function setDefaultCurrencyRow(
  tenantId: string,
  currencyCode: string,
  now: number
): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const currency = await transaction.currency.findFirst({
      where: { code: currencyCode, isActive: true },
      select: { code: true },
    })
    if (!currency) return false
    await transaction.tenantCurrency.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false, updatedAt: now },
    })
    await transaction.tenantCurrency.upsert({
      where: { tenantId_currencyCode: { tenantId, currencyCode } },
      create: {
        tenantId,
        currencyCode,
        isDefault: true,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
      update: { isDefault: true, isEnabled: true, updatedAt: now },
    })
    await transaction.tenant.update({
      where: { id: tenantId },
      data: { defaultCurrency: currencyCode, updatedAt: now },
    })
    return true
  })
}

export async function updateCurrencyRow(data: {
  tenantId: string
  code: string
  name?: string
  symbol: string | null
  decimalPlaces?: number
  now: number
}): Promise<boolean> {
  const enabled = await prisma.tenantCurrency.findFirst({
    where: { tenantId: data.tenantId, currencyCode: data.code, isEnabled: true },
    select: { currencyCode: true },
  })
  if (!enabled) return false
  await prisma.currency.update({
    where: { code: data.code },
    data: {
      name: data.name,
      symbol: data.symbol,
      decimalPlaces: data.decimalPlaces,
      updatedAt: data.now,
    },
  })
  return true
}

export async function removeCurrencyRow(
  tenantId: string,
  currencyCode: string
): Promise<'removed' | 'missing' | 'default'> {
  const tenantCurrency = await prisma.tenantCurrency.findFirst({
    where: { tenantId, currencyCode, isEnabled: true },
    select: { isDefault: true },
  })
  if (!tenantCurrency) return 'missing'
  if (tenantCurrency.isDefault) return 'default'
  await prisma.tenantCurrency.update({
    where: { tenantId_currencyCode: { tenantId, currencyCode } },
    data: { isEnabled: false },
  })
  return 'removed'
}
