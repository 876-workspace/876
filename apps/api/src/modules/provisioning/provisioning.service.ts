import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { listObject, type ListObject } from '@/http/envelope'
import {
  catalogDefinitions,
  validateDraft,
} from '@/services/provisioning-catalog'

import * as repository from './provisioning.repository'
import {
  serializeManifest,
  serializeNote,
  serializeRevision,
  serializeRun,
} from './provisioning.serializers'
import type { ProvisioningDraftReplace } from './provisioning.schemas'

// Helper to resolve application target: returns { storageKey (id), catalogKey (slug) }
async function requireValidTarget(
  targetType: string,
  targetKey: string
): Promise<string> {
  if (targetType !== 'application') return targetKey
  const app = await repository.findAppByIdOrSlug(targetKey)
  if (!app) {
    throw new AppHttpError({
      code: 'provisioning/target-not-found',
      message: 'Provisioning target was not found.',
      httpStatus: 404,
    })
  }
  return app.slug
}

async function storageTargetKey(
  targetType: string,
  targetKey: string
): Promise<string> {
  if (targetType !== 'application') return targetKey
  const app = await repository.findAppByIdOrSlug(targetKey)
  if (!app) {
    throw new AppHttpError({
      code: 'provisioning/target-not-found',
      message: 'Provisioning target was not found.',
      httpStatus: 404,
    })
  }
  return app.id
}

function revisionAsDraft(row: {
  financeDependency: string
  financeScopes: string[]
  provisioningResources: Array<{
    resourceType: string
    key: string
    position: number
    provisioningProperties: Array<{
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
  provisioningSteps: Array<{
    key: string
    description: string
    position: number
  }>
}): ProvisioningDraftReplace {
  return {
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: row.financeDependency as 'none' | 'embedded',
    finance_scopes: row.financeScopes,
    resources: row.provisioningResources.map((r) => ({
      resource_type: r.resourceType,
      key: r.key,
      position: r.position,
      properties: r.provisioningProperties.map((p) => ({
        key: p.key,
        value_type: p.valueType as never,
        string_value: p.stringValue,
        integer_value: p.integerValue === null ? null : Number(p.integerValue),
        decimal_value: p.decimalValue as string | null,
        boolean_value: p.booleanValue,
        reference_namespace: p.referenceNamespace,
        reference_key: p.referenceKey,
      })),
    })),
    steps: row.provisioningSteps.map((s) => ({
      key: s.key,
      description: s.description,
      position: s.position,
    })),
  }
}

export async function retrieveCatalog(targetType: string, targetKey: string) {
  const catalogKey = await requireValidTarget(targetType, targetKey)
  const definitions = catalogDefinitions(targetType as never, catalogKey)
  return {
    object: 'provisioning_catalog' as const,
    manifest_version: 1 as const,
    target_type: targetType as never,
    resource_types: definitions,
  }
}

export async function retrieveManifest(targetType: string, targetKey: string) {
  const storageKey = await storageTargetKey(targetType, targetKey)
  const manifest = await repository.findManifestFirst(targetType, storageKey)
  if (!manifest) {
    throw new AppHttpError({
      code: 'provisioning/manifest-not-found',
      message: 'Provisioning manifest was not found.',
      httpStatus: 404,
    })
  }
  const published = await repository.findRevisionByStatus(
    targetType,
    storageKey,
    'published'
  )
  const draft = await repository.findRevisionByStatus(
    targetType,
    storageKey,
    'draft'
  )
  return serializeManifest(
    manifest as never,
    published as never,
    draft as never
  )
}

export async function retrievePublished(targetType: string, targetKey: string) {
  const storageKey = await storageTargetKey(targetType, targetKey)
  const revision = await repository.findRevisionByStatus(
    targetType,
    storageKey,
    'published'
  )
  if (!revision) {
    throw new AppHttpError({
      code: 'provisioning/published-revision-not-found',
      message: 'Published provisioning revision was not found.',
      httpStatus: 404,
    })
  }
  return serializeRevision(revision as never)
}

export async function replaceDraft(
  targetType: string,
  targetKey: string,
  body: ProvisioningDraftReplace
) {
  const catalogKey = await requireValidTarget(targetType, targetKey)
  const storageKey = await storageTargetKey(targetType, targetKey)
  const issues = validateDraft(targetType as never, catalogKey, body as never)
  if (issues.length > 0) {
    throw new AppHttpError({
      code: 'provisioning/invalid-draft',
      message: `Provisioning draft does not match the registered resource schemas: ${issues[0]!.path}: ${issues[0]!.message}`,
      httpStatus: 422,
    })
  }
  const now = nowUnixSeconds()
  const revision = await repository.replaceDraft(targetType, storageKey, {
    reconciliation: body.reconciliation ?? 'create_missing',
    preserveTenantOverrides: body.preserve_tenant_overrides ?? true,
    financeDependency: body.finance_dependency ?? 'none',
    financeScopes: body.finance_scopes ?? [],
    resources: body.resources as never,
    steps: body.steps as never,
    now,
  })
  return serializeRevision(revision as never)
}

export async function validateDraftRequest(
  targetType: string,
  targetKey: string,
  body: ProvisioningDraftReplace
) {
  const catalogKey = await requireValidTarget(targetType, targetKey)
  const issues = validateDraft(targetType as never, catalogKey, body as never)
  return {
    object: 'provisioning_validation' as const,
    valid: issues.length === 0,
    issues,
  }
}

export async function publishDraft(targetType: string, targetKey: string) {
  const storageKey = await storageTargetKey(targetType, targetKey)
  const locked = await repository.retrieveDraftForUpdate(targetType, storageKey)
  if (!locked) {
    throw new AppHttpError({
      code: 'provisioning/draft-not-found',
      message: 'Provisioning draft was not found.',
      httpStatus: 404,
    })
  }
  const catalogKey = await requireValidTarget(targetType, targetKey)
  const draftAsInput = revisionAsDraft(locked.draft as never)
  const issues = validateDraft(
    targetType as never,
    catalogKey,
    draftAsInput as never
  )
  if (issues.length > 0) {
    throw new AppHttpError({
      code: 'provisioning/invalid-draft',
      message: `Provisioning draft does not match the registered resource schemas: ${issues[0]!.path}: ${issues[0]!.message}`,
      httpStatus: 422,
    })
  }
  const published = await repository.promoteDraft(
    locked.manifest as never,
    locked.draft as never,
    nowUnixSeconds()
  )
  // Note: finance reconciliation would happen here in Python; stubbed to avoid circular deps
  return serializeRevision(published as never)
}

export async function listRuns(query: {
  organization_id?: string
  app_id?: string
  status?: string
  limit: number
  starting_after?: string
  ending_before?: string
}): Promise<ListObject<ReturnType<typeof serializeRun>>> {
  if (query.starting_after && query.ending_before) {
    throw new AppHttpError({
      code: 'provisioning/invalid-cursor',
      message: 'Use either starting_after or ending_before, not both.',
      httpStatus: 422,
    })
  }
  let storageAppId: string | undefined
  if (query.app_id) {
    const app = await repository.findAppByIdOrSlug(query.app_id)
    if (!app) {
      throw new AppHttpError({
        code: 'provisioning/target-not-found',
        message: 'Provisioning target was not found.',
        httpStatus: 404,
      })
    }
    storageAppId = app.id
  }
  const { data, hasMore } = await repository.listRuns({
    organization_id: query.organization_id,
    app_id: storageAppId,
    status: query.status,
    limit: query.limit,
    starting_after: query.starting_after,
    ending_before: query.ending_before,
  })
  return listObject({
    data: (data as never[]).map((r) => serializeRun(r as never)),
    hasMore,
    url: '/provisioning/runs',
  })
}

export async function claimApplicationRun(body: {
  organization_id: string
  app_id: string
}) {
  const app = await repository.findAppByIdOrSlug(body.app_id)
  if (!app) {
    throw new AppHttpError({
      code: 'provisioning/target-not-found',
      message: 'Provisioning target was not found.',
      httpStatus: 404,
    })
  }
  const run = await repository.claimApplicationRun(
    body.organization_id,
    app.id,
    nowUnixSeconds()
  )
  if (!run) {
    throw new AppHttpError({
      code: 'provisioning/run-not-claimable',
      message: 'No queued application provisioning run was found.',
      httpStatus: 409,
    })
  }
  return serializeRun(run as never)
}

export async function reconcileRuns(body: {
  app_id?: string | null
  organization_id?: string | null
  limit: number
  starting_after?: string | null
}) {
  let appId: string | null | undefined = body.app_id
  if (appId) {
    const app = await repository.findAppByIdOrSlug(appId)
    if (!app) {
      throw new AppHttpError({
        code: 'provisioning/target-not-found',
        message: 'Provisioning target was not found.',
        httpStatus: 404,
      })
    }
    appId = app.id
  }
  // Stubbed reconciliation: mimic finance provisioning without full logic
  // For now, return empty reconcile result
  // In real implementation this would call reconcileFinanceConnections
  return {
    object: 'provisioning_reconciliation' as const,
    examined: 0,
    enqueued: 0,
    next_cursor: null,
  }
}

export async function retrieveRun(runId: string) {
  const run = await repository.findRunById(runId)
  if (!run) {
    throw new AppHttpError({
      code: 'provisioning/run-not-found',
      message: 'Provisioning run was not found.',
      httpStatus: 404,
    })
  }
  return serializeRun(run as never)
}

export async function retryRun(runId: string) {
  const result = await repository.retryRun(runId, nowUnixSeconds())
  if (result === null) {
    throw new AppHttpError({
      code: 'provisioning/run-not-found',
      message: 'Provisioning run was not found.',
      httpStatus: 404,
    })
  }
  if ((result as { error?: string }).error === 'not_retryable') {
    throw new AppHttpError({
      code: 'provisioning/run-not-retryable',
      message: 'Only failed provisioning runs can be retried.',
      httpStatus: 409,
    })
  }
  if ((result as { error?: string }).error === 'event_not_found') {
    throw new AppHttpError({
      code: 'provisioning/run-event-not-found',
      message: "The provisioning run's delivery event was not found.",
      httpStatus: 409,
    })
  }
  return serializeRun(result as never)
}

export async function completeApplicationRun(
  runId: string,
  body: { status: 'succeeded' | 'failed'; error?: string | null }
) {
  const result = await repository.completeApplicationRun(
    runId,
    body.status,
    body.error ?? null,
    nowUnixSeconds()
  )
  if (result === null) {
    throw new AppHttpError({
      code: 'provisioning/run-not-found',
      message: 'Provisioning run was not found.',
      httpStatus: 404,
    })
  }
  if ((result as { error?: string }).error === 'not_completable') {
    throw new AppHttpError({
      code: 'provisioning/run-not-completable',
      message: 'Only processing application-owned runs can be completed.',
      httpStatus: 409,
    })
  }
  return serializeRun(result as never)
}

export async function listNotes(
  targetType: string,
  targetKey: string,
  query: { limit: number; starting_after?: string; ending_before?: string }
): Promise<ListObject<ReturnType<typeof serializeNote>>> {
  const storageKey = await storageTargetKey(targetType, targetKey)
  const manifest = await repository.findManifestFirst(targetType, storageKey)
  if (!manifest) {
    throw new AppHttpError({
      code: 'provisioning/manifest-not-found',
      message: 'Provisioning manifest was not found.',
      httpStatus: 404,
    })
  }
  const { data, hasMore } = await repository.listNotes(
    manifest.id,
    query as never
  )
  return listObject({
    data: (data as never[]).map((r) => serializeNote(r as never)),
    hasMore,
    url: `/provisioning/manifests/${targetType}/${targetKey}/notes`,
  })
}

export async function createNote(
  targetType: string,
  targetKey: string,
  body: { body: string; author_user_id?: string | null }
) {
  const storageKey = await storageTargetKey(targetType, targetKey)
  const manifest = await repository.findManifestFirst(targetType, storageKey)
  if (!manifest) {
    throw new AppHttpError({
      code: 'provisioning/manifest-not-found',
      message: 'Provisioning manifest was not found.',
      httpStatus: 404,
    })
  }
  const now = nowUnixSeconds()
  const note = await repository.createNote({
    id: generateId('provisioningNote'),
    manifestId: manifest.id,
    body: body.body,
    authorUserId: body.author_user_id ?? null,
    now,
  })
  return serializeNote(note as never)
}

export async function deleteNote(
  targetType: string,
  targetKey: string,
  noteId: string
) {
  const storageKey = await storageTargetKey(targetType, targetKey)
  const manifest = await repository.findManifestFirst(targetType, storageKey)
  if (!manifest || !(await repository.deleteNote(manifest.id, noteId))) {
    throw new AppHttpError({
      code: 'provisioning/note-not-found',
      message: 'Provisioning note was not found.',
      httpStatus: 404,
    })
  }
  return {
    object: 'provisioning_note' as const,
    id: noteId,
    deleted: true as const,
  }
}
