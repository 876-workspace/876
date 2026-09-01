import { prisma } from '@/db/client'
import type { AccountingResourceType } from '@/providers/accounting'

export function localAccountingResourceExists(
  tenantId: string,
  resourceType: 'customer' | 'item',
  resourceId: string
) {
  if (resourceType === 'customer')
    return prisma.customer
      .count({ where: { tenantId, id: resourceId } })
      .then((count) => count > 0)

  return prisma.item
    .count({ where: { tenantId, id: resourceId } })
    .then((count) => count > 0)
}

export function listAccountingReferencesByExternalIds(params: {
  connectionId: string
  resourceType: AccountingResourceType
  externalIds: string[]
}) {
  if (!params.externalIds.length) return Promise.resolve([])
  return prisma.providerReference.findMany({
    where: {
      accountingProviderConnectionId: params.connectionId,
      resourceType: params.resourceType,
      externalId: { in: params.externalIds },
    },
    select: { resourceId: true, externalId: true },
  })
}

export function findAccountingReferenceByProviderExternal(params: {
  provider: string
  externalType: string
  externalId: string
}) {
  return prisma.providerReference.findUnique({
    where: {
      billing_provider_references_external_key: {
        provider: params.provider,
        externalType: params.externalType,
        externalId: params.externalId,
      },
    },
    select: {
      resourceId: true,
      externalId: true,
      accountingProviderConnectionId: true,
    },
  })
}
