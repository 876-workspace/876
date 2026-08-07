import { prisma } from '@/db/client'

export type ProvisioningManifestRow = {
  id: string
  targetType: string
  targetKey: string
}

export type ProvisioningRevisionRow = {
  id: string
  manifestId: string
  revision: number
  status: string
  reconciliation: string
  preserveTenantOverrides: boolean
  financeDependency: string
  financeScopes: string[]
  publishedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type ProvisioningResourceRow = {
  id: string
  revisionId: string
  resourceType: string
  key: string
  position: number
}

export type ProvisioningPropertyRow = {
  id: string
  resourceId: string
  key: string
  valueType: string
  stringValue: string | null
  integerValue: bigint | null
  decimalValue: unknown
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}

export type ProvisioningStepRow = {
  id: string
  revisionId: string
  key: string
  description: string
  position: number
}

export async function findAppBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  return prisma.app.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
}

export async function findManifest(
  targetType: string,
  targetKey: string
): Promise<ProvisioningManifestRow | null> {
  const row = await prisma.provisioningManifest.findUnique({
    where: { targetType_targetKey: { targetType, targetKey } },
    select: { id: true, targetType: true, targetKey: true },
  })
  return row
}

export async function findRevision(
  targetType: string,
  targetKey: string,
  status: string
): Promise<
  | (ProvisioningRevisionRow & {
      resources: Array<
        ProvisioningResourceRow & { properties: ProvisioningPropertyRow[] }
      >
      steps: ProvisioningStepRow[]
    })
  | null
> {
  const manifest = await prisma.provisioningManifest.findUnique({
    where: { targetType_targetKey: { targetType, targetKey } },
    select: { id: true },
  })
  if (!manifest) return null

  const revision = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId: manifest.id, status },
    include: {
      provisioningResources: { include: { provisioningProperties: true } },
      provisioningSteps: true,
    },
    orderBy: { revision: 'desc' },
  })
  if (!revision) return null

  return {
    id: revision.id,
    manifestId: revision.manifestId,
    revision: revision.revision,
    status: revision.status,
    reconciliation: revision.reconciliation,
    preserveTenantOverrides: revision.preserveTenantOverrides,
    financeDependency: revision.financeDependency,
    financeScopes: revision.financeScopes,
    publishedAt: revision.publishedAt,
    createdAt: revision.createdAt,
    updatedAt: revision.updatedAt,
    resources: revision.provisioningResources.map((resource) => ({
      id: resource.id,
      revisionId: resource.revisionId,
      resourceType: resource.resourceType,
      key: resource.key,
      position: resource.position,
      properties: resource.provisioningProperties.map((property) => ({
        id: property.id,
        resourceId: property.resourceId,
        key: property.key,
        valueType: property.valueType,
        stringValue: property.stringValue,
        integerValue: property.integerValue,
        decimalValue: property.decimalValue,
        booleanValue: property.booleanValue,
        referenceNamespace: property.referenceNamespace,
        referenceKey: property.referenceKey,
      })),
    })),
    steps: revision.provisioningSteps.map((step) => ({
      id: step.id,
      revisionId: step.revisionId,
      key: step.key,
      description: step.description,
      position: step.position,
    })),
  } as unknown as ProvisioningRevisionRow & {
    resources: Array<
      ProvisioningResourceRow & { properties: ProvisioningPropertyRow[] }
    >
    steps: ProvisioningStepRow[]
  }
}

export async function findDraft(
  targetType: string,
  targetKey: string
): Promise<ProvisioningRevisionRow | null> {
  const row = await findRevision(targetType, targetKey, 'draft')
  if (!row) return null
  return row
}

export async function findPublished(
  targetType: string,
  targetKey: string
): Promise<ProvisioningRevisionRow | null> {
  const row = await findRevision(targetType, targetKey, 'published')
  if (!row) return null
  return row
}

export async function ensureManifest(
  targetType: string,
  targetKey: string,
  now: bigint
): Promise<string> {
  const existing = await prisma.provisioningManifest.findUnique({
    where: { targetType_targetKey: { targetType, targetKey } },
    select: { id: true },
  })
  if (existing) return existing.id

  const { generateId } = await import('@/platform/ids')
  const row = await prisma.provisioningManifest.create({
    data: {
      id: generateId('provisioningManifest'),
      targetType,
      targetKey,
      manifestVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  })
  return row.id
}

export async function replaceDraft(params: {
  targetType: string
  targetKey: string
  reconciliation: string
  preserveTenantOverrides: boolean
  financeDependency: string
  financeScopes: string[]
  resources: Array<{
    resourceType: string
    key: string
    position: number
    properties: Array<{
      key: string
      valueType: string
      stringValue: string | null
      integerValue: bigint | null
      decimalValue: unknown
      booleanValue: boolean | null
      referenceNamespace: string | null
      referenceKey: string | null
    }>
  }>
  steps: Array<{ key: string; description: string; position: number }>
  now: bigint
}): Promise<string> {
  const { generateId } = await import('@/platform/ids')
  const manifestId = await ensureManifest(
    params.targetType,
    params.targetKey,
    params.now
  )

  // Remove existing draft if any.
  const existingDraft = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId, status: 'draft' },
    select: { id: true },
  })
  if (existingDraft) {
    await prisma.provisioningManifestRevision.delete({
      where: { id: existingDraft.id },
    })
  }

  const maxRevision = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId },
    orderBy: { revision: 'desc' },
    select: { revision: true },
  })
  const nextRevision = (maxRevision?.revision ?? 0) + 1

  const revisionId = generateId('provisioningRevision')
  await prisma.provisioningManifestRevision.create({
    data: {
      id: revisionId,
      manifestId,
      revision: nextRevision,
      status: 'draft',
      reconciliation: params.reconciliation,
      preserveTenantOverrides: params.preserveTenantOverrides,
      financeDependency: params.financeDependency,
      financeScopes: params.financeScopes,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })

  for (const resource of params.resources) {
    const resourceId = generateId('provisioningResource')
    await prisma.provisioningResource.create({
      data: {
        id: resourceId,
        revisionId,
        resourceType: resource.resourceType,
        key: resource.key,
        position: resource.position,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })
    for (const property of resource.properties) {
      await prisma.provisioningProperty.create({
        data: {
          id: generateId('provisioningProperty'),
          resourceId,
          key: property.key,
          valueType: property.valueType,
          stringValue: property.stringValue,
          integerValue: property.integerValue,
          decimalValue: property.decimalValue as never,
          booleanValue: property.booleanValue,
          referenceNamespace: property.referenceNamespace,
          referenceKey: property.referenceKey,
          createdAt: params.now,
          updatedAt: params.now,
        },
      })
    }
  }

  for (const step of params.steps) {
    await prisma.provisioningStep.create({
      data: {
        id: generateId('provisioningStep'),
        revisionId,
        key: step.key,
        description: step.description,
        position: step.position,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })
  }

  return revisionId
}

export async function publishDraft(
  targetType: string,
  targetKey: string,
  now: bigint
): Promise<ProvisioningRevisionRow | null> {
  const manifest = await prisma.provisioningManifest.findUnique({
    where: { targetType_targetKey: { targetType, targetKey } },
    select: { id: true },
  })
  if (!manifest) return null

  const draft = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId: manifest.id, status: 'draft' },
    select: { id: true },
  })
  if (!draft) return null

  await prisma.provisioningManifestRevision.update({
    where: { id: draft.id },
    data: { status: 'published', publishedAt: now, updatedAt: now },
  })

  const published = await prisma.provisioningManifestRevision.findUnique({
    where: { id: draft.id },
  })
  if (!published) return null
  return published as unknown as ProvisioningRevisionRow
}
