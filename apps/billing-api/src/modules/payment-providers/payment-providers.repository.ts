import { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type {
  ProviderConnectionCreateBody,
  ProviderConnectionUpdateBody,
} from './payment-providers.schemas'

export function listProviderRows() {
  return prisma.paymentProvider.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    take: 100,
  })
}

export function listProviderConnectionRows(tenantId: string) {
  return prisma.paymentProviderConnection.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export function findActiveProviderRow(id: string) {
  return prisma.paymentProvider.findFirst({
    where: { id, isActive: true },
    select: { id: true },
  })
}

export function createProviderConnectionRow(
  tenantId: string,
  id: string,
  body: ProviderConnectionCreateBody,
  now: number
) {
  return prisma.paymentProviderConnection.create({
    data: {
      id,
      tenantId,
      providerId: body.providerId,
      name: body.name,
      environment: body.environment,
      status: 'PENDING',
      merchantAccountId: body.merchantAccountId ?? null,
      credentialsReference: body.credentialsReference ?? null,
      webhookSecretReference: body.webhookSecretReference ?? null,
      settings: body.settings === null ? Prisma.JsonNull : body.settings,
      createdAt: now,
      updatedAt: now,
    },
  })
}

export async function updateProviderConnectionRow(
  tenantId: string,
  id: string,
  body: ProviderConnectionUpdateBody,
  now: number
) {
  const { settings, ...values } = body
  const result = await prisma.paymentProviderConnection.updateMany({
    where: { tenantId, id },
    data: {
      ...values,
      ...(settings === undefined
        ? {}
        : { settings: settings === null ? Prisma.JsonNull : settings }),
      updatedAt: now,
    },
  })
  if (result.count === 0) return null
  return prisma.paymentProviderConnection.findFirst({ where: { tenantId, id } })
}
