import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import { Prisma } from '@/lib/db/generated/prisma/client'
import type {
  PaymentProviderConnectionCreateParams,
  PaymentProviderConnectionUpdateParams,
} from '@/types/payment-provider'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

async function create(
  tenantId: string,
  params: PaymentProviderConnectionCreateParams
): ServiceResult<{ id: string }> {
  const provider = await prisma.paymentProvider.findFirst({
    where: { id: params.providerId, isActive: true },
  })
  if (!provider) return err('Payment provider not found.', 404)

  const now = nowUnixSeconds()
  const connection = await prisma.paymentProviderConnection.create({
    data: {
      id: generateId('PaymentProviderConnection'),
      tenantId,
      providerId: provider.id,
      name: params.name,
      environment: params.environment,
      status: 'PENDING',
      merchantAccountId: params.merchantAccountId ?? null,
      credentialsReference: params.credentialsReference ?? null,
      webhookSecretReference: params.webhookSecretReference ?? null,
      settings: params.settings === null ? Prisma.JsonNull : params.settings,
      createdAt: now,
      updatedAt: now,
    },
  })

  return ok({ id: connection.id })
}

async function update(
  tenantId: string,
  connectionId: string,
  params: PaymentProviderConnectionUpdateParams
): ServiceResult<{ id: string }> {
  const result = await prisma.paymentProviderConnection.updateMany({
    where: { id: connectionId, tenantId },
    data: {
      ...params,
      settings: params.settings === null ? Prisma.JsonNull : params.settings,
      updatedAt: nowUnixSeconds(),
    },
  })
  if (result.count === 0) return err('Provider connection not found.', 404)

  return ok({ id: connectionId })
}

export const paymentProviders = {
  listCatalog() {
    return prisma.paymentProvider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  },
  connections: {
    create,
    list(tenantId: string) {
      return prisma.paymentProviderConnection.findMany({
        where: { tenantId },
        select: {
          id: true,
          providerId: true,
          name: true,
          environment: true,
          status: true,
          merchantAccountId: true,
          lastSyncedAt: true,
          createdAt: true,
          updatedAt: true,
          provider: {
            select: { id: true, key: true, name: true, logoUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    },
    update,
  },
}
