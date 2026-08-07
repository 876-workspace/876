import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'
import { generateId } from '@/platform/ids'

// ---------------------------------------------------------------------------
// App helpers for target resolution
// ---------------------------------------------------------------------------

export async function findAppByIdOrSlug(
  targetKey: string
): Promise<{ id: string; slug: string } | null> {
  const row = await prisma.app.findFirst({
    where: { OR: [{ id: targetKey }, { slug: targetKey }] },
    select: { id: true, slug: true },
  })
  return row
}

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

const MANIFEST_SELECT = {
  id: true,
  targetType: true,
  targetKey: true,
  manifestVersion: true,
  createdAt: true,
  updatedAt: true,
} as const

export type ManifestRow = {
  id: string
  targetType: string
  targetKey: string
  manifestVersion: number
  createdAt: bigint
  updatedAt: bigint
}

export function findManifest(
  targetType: string,
  targetKey: string
): Promise<ManifestRow | null> {
  return prisma.provisioningManifest.findUnique({
    where: { targetType_targetKey: { targetType, targetKey } },
    select: MANIFEST_SELECT,
  })
}

// Prisma doesn't have composite unique helper for targetType_targetKey in findUnique without correct name; use findFirst.
export function findManifestFirst(targetType: string, targetKey: string) {
  return prisma.provisioningManifest.findFirst({
    where: { targetType, targetKey },
    select: {
      id: true,
      targetType: true,
      targetKey: true,
      manifestVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export function findRevisionByStatus(
  targetType: string,
  targetKey: string,
  status: string
) {
  return prisma.provisioningManifestRevision.findFirst({
    where: {
      provisioningManifest: { targetType, targetKey },
      status,
    },
    include: {
      provisioningResources: { include: { provisioningProperties: true } },
      provisioningSteps: true,
    },
  })
}

export async function getOrCreateManifest(
  targetType: string,
  targetKey: string,
  now: number
): Promise<{
  id: string
  targetType: string
  targetKey: string
  createdAt: bigint
  updatedAt: bigint
}> {
  const existing = await findManifestFirst(targetType, targetKey)
  if (existing) return existing as never
  try {
    const created = await prisma.provisioningManifest.create({
      data: {
        id: generateId('provisioningManifest'),
        targetType,
        targetKey,
        manifestVersion: 1,
        createdAt: BigInt(now),
        updatedAt: BigInt(now),
      },
      select: {
        id: true,
        targetType: true,
        targetKey: true,
        manifestVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return created as never
  } catch {
    const retry = await findManifestFirst(targetType, targetKey)
    if (!retry) throw new Error('Failed to get or create manifest')
    return retry as never
  }
}

export async function replaceDraft(
  targetType: string,
  targetKey: string,
  input: {
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
        integerValue: number | null
        decimalValue: string | null
        booleanValue: boolean | null
        referenceNamespace: string | null
        referenceKey: string | null
      }>
    }>
    steps: Array<{ key: string; description: string; position: number }>
    now: number
  }
) {
  const manifest = await getOrCreateManifest(targetType, targetKey, input.now)

  let draft = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId: manifest.id, status: 'draft' },
    include: { provisioningResources: true, provisioningSteps: true },
  })

  const nowBig = BigInt(input.now)

  if (!draft) {
    const maxRevision = await prisma.provisioningManifestRevision.findFirst({
      where: { manifestId: manifest.id },
      orderBy: { revision: 'desc' },
      select: { revision: true },
    })
    const nextRevision = (maxRevision?.revision ?? 0) + 1
    draft = await prisma.provisioningManifestRevision.create({
      data: {
        id: generateId('provisioningRevision'),
        manifestId: manifest.id,
        revision: nextRevision,
        status: 'draft',
        reconciliation: input.reconciliation,
        preserveTenantOverrides: input.preserveTenantOverrides,
        financeDependency: input.financeDependency,
        financeScopes: input.financeScopes,
        createdAt: nowBig,
        updatedAt: nowBig,
      },
      include: {
        provisioningResources: { include: { provisioningProperties: true } },
        provisioningSteps: true,
      },
    })
  } else {
    // delete existing resources/steps
    await prisma.provisioningResource.deleteMany({
      where: { revisionId: draft.id },
    })
    // steps cascade via deleteMany
    await prisma.provisioningStep.deleteMany({
      where: { revisionId: draft.id },
    })
    draft = await prisma.provisioningManifestRevision.update({
      where: { id: draft.id },
      data: {
        reconciliation: input.reconciliation,
        preserveTenantOverrides: input.preserveTenantOverrides,
        financeDependency: input.financeDependency,
        financeScopes: input.financeScopes,
        updatedAt: nowBig,
      },
      include: {
        provisioningResources: { include: { provisioningProperties: true } },
        provisioningSteps: true,
      },
    })
  }

  // create resources and properties
  for (const r of input.resources) {
    const resourceId = generateId('provisioningResource')
    await prisma.provisioningResource.create({
      data: {
        id: resourceId,
        revisionId: draft.id,
        resourceType: r.resourceType,
        key: r.key,
        position: r.position,
        createdAt: nowBig,
        updatedAt: nowBig,
      },
    })
    for (const p of r.properties) {
      await prisma.provisioningProperty.create({
        data: {
          id: generateId('provisioningProperty'),
          resourceId,
          key: p.key,
          valueType: p.valueType,
          stringValue: p.stringValue,
          integerValue:
            p.integerValue === null || p.integerValue === undefined
              ? null
              : BigInt(p.integerValue),
          decimalValue: p.decimalValue as never,
          booleanValue: p.booleanValue,
          referenceNamespace: p.referenceNamespace,
          referenceKey: p.referenceKey,
          createdAt: nowBig,
          updatedAt: nowBig,
        },
      })
    }
  }

  for (const s of input.steps) {
    await prisma.provisioningStep.create({
      data: {
        id: generateId('provisioningStep'),
        revisionId: draft.id,
        key: s.key,
        description: s.description,
        position: s.position,
        createdAt: nowBig,
        updatedAt: nowBig,
      },
    })
  }

  await prisma.provisioningManifest.update({
    where: { id: manifest.id },
    data: { updatedAt: nowBig },
  })

  const refreshed = await prisma.provisioningManifestRevision.findUnique({
    where: { id: draft.id },
    include: {
      provisioningResources: { include: { provisioningProperties: true } },
      provisioningSteps: true,
    },
  })
  return refreshed
}

export async function retrieveDraftForUpdate(
  targetType: string,
  targetKey: string
): Promise<{
  manifest: {
    id: string
    targetType: string
    targetKey: string
    updatedAt: bigint
  }
  draft: NonNullable<Awaited<ReturnType<typeof findRevisionByStatus>>>
} | null> {
  const manifest = await findManifestFirst(targetType, targetKey)
  if (!manifest) return null
  const draft = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId: manifest.id, status: 'draft' },
    include: {
      provisioningResources: { include: { provisioningProperties: true } },
      provisioningSteps: true,
    },
  })
  if (!draft) return null
  return { manifest: manifest as never, draft: draft as never }
}

export async function promoteDraft(
  manifest: { id: string },
  draft: { id: string },
  now: number
) {
  const nowBig = BigInt(now)
  const current = await prisma.provisioningManifestRevision.findFirst({
    where: { manifestId: manifest.id, status: 'published' },
  })
  if (current) {
    await prisma.provisioningManifestRevision.update({
      where: { id: current.id },
      data: { status: 'archived', updatedAt: nowBig },
    })
  }
  const promoted = await prisma.provisioningManifestRevision.update({
    where: { id: draft.id },
    data: { status: 'published', publishedAt: nowBig, updatedAt: nowBig },
    include: {
      provisioningResources: { include: { provisioningProperties: true } },
      provisioningSteps: true,
    },
  })
  await prisma.provisioningManifest.update({
    where: { id: manifest.id },
    data: { updatedAt: nowBig },
  })
  return promoted
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

const NOTE_SELECT = {
  id: true,
  manifestId: true,
  body: true,
  authorUserId: true,
  createdAt: true,
  updatedAt: true,
} as const

const RUN_INCLUDE = {
  provisioningRunSteps: { orderBy: { position: 'asc' } },
} as const

export function listNotes(
  manifestId: string,
  query: PaginationQuery
): Promise<{
  data: Array<{
    id: string
    manifestId: string
    body: string
    authorUserId: string | null
    createdAt: bigint
    updatedAt: bigint
  }>
  hasMore: boolean
}> {
  return paginateByCursor({
    query,
    // The anchor is read with the page's own projection: a narrower one does
    // not satisfy the row type, and casting it away is how a cursor read ends
    // up returning a shape the serializer cannot handle.
    loadAnchor: (id) =>
      prisma.provisioningNote.findUnique({
        where: { id },
        select: NOTE_SELECT,
      }),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) => {
      const where: Record<string, unknown> = { manifestId }
      if (cursor) {
        // Need to handle tie-breaker on id similar to Python
        // Simplify to createdAt comparison only
        return prisma.provisioningNote.findMany({
          where: {
            ...where,
            createdAt: { [cursor.direction]: cursor.value } as never,
          },
          orderBy: [{ createdAt: order }, { id: order }],
          take,
          select: NOTE_SELECT,
        }) as Promise<never>
      }
      return prisma.provisioningNote.findMany({
        where,
        orderBy: [{ createdAt: order }, { id: order }],
        take,
        select: NOTE_SELECT,
      }) as Promise<never>
    },
  }) as Promise<never>
}

export function createNote(data: {
  id: string
  manifestId: string
  body: string
  authorUserId: string | null
  now: number
}) {
  return prisma.provisioningNote.create({
    data: {
      id: data.id,
      manifestId: data.manifestId,
      body: data.body,
      authorUserId: data.authorUserId,
      createdAt: BigInt(data.now),
      updatedAt: BigInt(data.now),
    },
    select: NOTE_SELECT,
  })
}

export async function deleteNote(
  manifestId: string,
  noteId: string
): Promise<boolean> {
  const result = await prisma.provisioningNote.deleteMany({
    where: { id: noteId, manifestId },
  })
  return result.count > 0
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export function findRunById(runId: string) {
  return prisma.provisioningRun.findUnique({
    where: { id: runId },
    include: { provisioningRunSteps: { orderBy: { position: 'asc' } } },
  })
}

export function listRuns(query: {
  organization_id?: string
  app_id?: string
  status?: string
  limit: number
  starting_after?: string
  ending_before?: string
}) {
  const where: Record<string, unknown> = {}
  if (query.organization_id) where.organizationId = query.organization_id
  if (query.app_id) where.appId = query.app_id
  if (query.status) where.status = query.status

  const paginationQuery = {
    limit: query.limit,
    starting_after: query.starting_after,
    ending_before: query.ending_before,
  } as PaginationQuery

  return paginateByCursor({
    query: paginationQuery,
    loadAnchor: (id) =>
      prisma.provisioningRun.findUnique({
        where: { id },
        include: RUN_INCLUDE,
      }),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.provisioningRun.findMany({
        where: cursor
          ? { ...where, createdAt: { [cursor.direction]: cursor.value } }
          : where,
        orderBy: [{ createdAt: order }, { id: order }],
        take,
        include: RUN_INCLUDE,
      }),
  })
}

export async function claimApplicationRun(
  organizationId: string,
  appId: string,
  now: number
) {
  const run = await prisma.provisioningRun.findFirst({
    where: {
      organizationId,
      appId,
      outboxEventId: null,
      status: 'queued',
      availableAt: { lte: BigInt(now) },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { provisioningRunSteps: true },
  })
  if (!run) return null
  const updated = await prisma.provisioningRun.update({
    where: { id: run.id },
    data: {
      status: 'processing',
      attemptCount: { increment: 1 },
      startedAt: BigInt(now),
      completedAt: null,
      lastError: null,
      updatedAt: BigInt(now),
    },
    include: { provisioningRunSteps: true },
  })
  // update steps
  for (const step of updated.provisioningRunSteps) {
    if (step.status !== 'succeeded') {
      await prisma.provisioningRunStep.update({
        where: { id: step.id },
        data: {
          status: 'processing',
          attemptCount: { increment: 1 },
          startedAt: BigInt(now),
          completedAt: null,
          lastError: null,
          updatedAt: BigInt(now),
        },
      })
    }
  }
  return prisma.provisioningRun.findUnique({
    where: { id: run.id },
    include: { provisioningRunSteps: { orderBy: { position: 'asc' } } },
  })
}

export async function retryRun(runId: string, now: number) {
  const run = await findRunById(runId)
  if (!run) return null
  if (run.status !== 'failed') return { error: 'not_retryable' as const }
  // handle outbox event
  if (run.outboxEventId) {
    const event = await prisma.financeProvisioningOutbox.findUnique({
      where: { id: run.outboxEventId },
    })
    if (!event) return { error: 'event_not_found' as const }
    await prisma.financeProvisioningOutbox.update({
      where: { id: event.id },
      data: {
        status: 'pending',
        availableAt: BigInt(now),
        lockedAt: null,
        lastError: null,
        updatedAt: BigInt(now),
      },
    })
  }
  await prisma.provisioningRun.update({
    where: { id: run.id },
    data: {
      status: 'queued',
      availableAt: BigInt(now),
      completedAt: null,
      lastError: null,
      updatedAt: BigInt(now),
    },
  })
  await prisma.provisioningRunStep.updateMany({
    where: { runId: run.id },
    data: {
      status: 'queued',
      completedAt: null,
      lastError: null,
      updatedAt: BigInt(now),
    },
  })
  return findRunById(runId)
}

export async function completeApplicationRun(
  runId: string,
  status: 'succeeded' | 'failed',
  error: string | null,
  now: number
) {
  const run = await findRunById(runId)
  if (!run) return null
  if (run.outboxEventId || run.status !== 'processing')
    return { error: 'not_completable' as const }

  if (status === 'succeeded') {
    await prisma.provisioningRun.update({
      where: { id: run.id },
      data: {
        status: 'succeeded',
        completedAt: BigInt(now),
        lastError: null,
        updatedAt: BigInt(now),
      },
    })
    await prisma.provisioningRunStep.updateMany({
      where: { runId: run.id },
      data: {
        status: 'succeeded',
        completedAt: BigInt(now),
        lastError: null,
        updatedAt: BigInt(now),
      },
    })
  } else {
    const msg = (error ?? 'Application provisioning failed.').trim()
    await prisma.provisioningRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        availableAt: BigInt(now),
        completedAt: BigInt(now),
        lastError: msg,
        updatedAt: BigInt(now),
      },
    })
    await prisma.provisioningRunStep.updateMany({
      where: { runId: run.id, status: { not: 'succeeded' } },
      data: {
        status: 'failed',
        completedAt: BigInt(now),
        lastError: msg,
        updatedAt: BigInt(now),
      },
    })
  }
  return findRunById(runId)
}
