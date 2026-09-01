import { prisma } from '@/db/client'

export function findOrganizationProvisioningSelection(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      provisioningSetupKey: true,
      provisioningSelectionType: true,
      provisioningMatchGroupKey: true,
      provisioningMatchPriority: true,
      provisioningMatchedFields: true,
      provisioningSetupSelectedAt: true,
      countryCode: true,
      currencyCode: true,
      language: true,
      regionId: true,
      region: { select: { code: true, countryCode: true } },
      createdAt: true,
    },
  })
}

export async function persistOrganizationProvisioningSelection(params: {
  organizationId: string
  setupKey: string
  selectionType: 'policy' | 'fallback' | 'backfill'
  matchGroupKey: string | null
  matchPriority: number | null
  matchedFields: string[]
  selectedAt: bigint
  currencyCode?: string | null
  language?: string | null
}): Promise<boolean> {
  const result = await prisma.organization.updateMany({
    where: {
      id: params.organizationId,
      provisioningSetupKey: null,
    },
    data: {
      provisioningSetupKey: params.setupKey,
      provisioningSelectionType: params.selectionType,
      provisioningMatchGroupKey: params.matchGroupKey,
      provisioningMatchPriority: params.matchPriority,
      provisioningMatchedFields: params.matchedFields,
      provisioningSetupSelectedAt: params.selectedAt,
      ...(params.currencyCode
        ? { currencyCode: params.currencyCode.toUpperCase() }
        : {}),
      ...(params.language ? { language: params.language } : {}),
      updatedAt: params.selectedAt,
    },
  })
  return result.count === 1
}

export async function listOrganizationsMissingProvisioningSelection(params: {
  limit: number
  startingAfter?: string | null
}) {
  return prisma.organization.findMany({
    where: {
      provisioningSetupKey: null,
      deletedAt: null,
      ...(params.startingAfter ? { id: { gt: params.startingAfter } } : {}),
    },
    orderBy: { id: 'asc' },
    take: params.limit,
    select: {
      id: true,
      countryCode: true,
      currencyCode: true,
      language: true,
      regionId: true,
      region: { select: { code: true, countryCode: true } },
      createdAt: true,
    },
  })
}

export function findAppBySlugWithKind(slug: string) {
  return prisma.app.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      appKind: true,
      status: true,
      deletedAt: true,
    },
  })
}
