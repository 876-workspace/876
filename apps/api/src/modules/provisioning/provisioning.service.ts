import { AppHttpError } from '@/http/errors'
import { listObject, type ListObject } from '@/http/envelope'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { reconcileFinanceConnections } from '@/services/finance-provisioning'
import { createFinanceProvisioningRepository } from '@/services/finance-provisioning.repository'
import {
  catalogDefinitions,
  validateProvisioningWireDraft,
} from '@/services/provisioning-catalog'

import { resolveDefaultApplicationManifestTarget } from './application-provisioning-profile.service'
import * as repository from './provisioning.repository'
import type { ProvisioningDraftReplace } from './provisioning.schemas'
import {
  serializeCatalog,
  serializeManifest,
  serializeNote,
  serializeRevision,
  serializeRun,
  serializeSetup,
} from './provisioning.serializers'

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

/**
 * Generic application manifest operations are the backwards-compatible default
 * profile surface. Variant-aware callers use the explicit profile routes.
 */
async function storageTargetKey(
  targetType: string,
  targetKey: string
): Promise<string> {
  if (targetType !== 'application') return targetKey
  const target = await resolveDefaultApplicationManifestTarget(targetKey)
  return target.manifestTargetKey
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

function draftForRepository(body: ProvisioningDraftReplace) {
  return {
    reconciliation: body.reconciliation ?? 'create_missing',
    preserveTenantOverrides: body.preserve_tenant_overrides ?? true,
    financeDependency: body.finance_dependency ?? 'none',
    financeScopes: body.finance_scopes ?? [],
    resources: body.resources.map((resource) => ({
      resourceType: resource.resource_type,
      key: resource.key,
      position: resource.position,
      properties: resource.properties.map((property) => ({
        key: property.key,
        valueType: property.value_type,
        stringValue: property.string_value ?? null,
        integerValue: property.integer_value ?? null,
        decimalValue: property.decimal_value ?? null,
        booleanValue: property.boolean_value ?? null,
        referenceNamespace: property.reference_namespace ?? null,
        referenceKey: property.reference_key ?? null,
      })),
    })),
    steps: body.steps.map((step) => ({
      key: step.key,
      description: step.description,
      position: step.position,
    })),
  }
}

const PARTIAL_DRAFT_ISSUE_CODES = new Set([
  'resource_minimum',
  'unresolved_reference',
])

function validateDraftForSave(
  targetType: string,
  targetKey: string,
  body: ProvisioningDraftReplace
) {
  return validateProvisioningWireDraft(
    targetType as never,
    targetKey,
    body
  ).filter((issue) => !PARTIAL_DRAFT_ISSUE_CODES.has(issue.code))
}

export async function retrieveCatalog(targetType: string, targetKey: string) {
  const catalogKey = await requireValidTarget(targetType, targetKey)
  const definitions = catalogDefinitions(targetType as never, catalogKey)
  return serializeCatalog(targetType, definitions)
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
  const issues = validateDraftForSave(targetType, catalogKey, body)
  if (issues.length > 0) {
    throw new AppHttpError({
      code: 'provisioning/invalid-draft',
      message: `Provisioning draft does not match the registered resource schemas: ${issues[0]!.path}: ${issues[0]!.message}`,
      httpStatus: 422,
    })
  }

  const revision = await repository.replaceDraft(targetType, storageKey, {
    ...draftForRepository(body),
    now: nowUnixSeconds(),
  })
  return serializeRevision(revision as never)
}

export async function validateDraftRequest(
  targetType: string,
  targetKey: string,
  body: ProvisioningDraftReplace
) {
  const catalogKey = await requireValidTarget(targetType, targetKey)
  const issues = validateProvisioningWireDraft(
    targetType as never,
    catalogKey,
    body
  )
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
  const issues = validateProvisioningWireDraft(
    targetType as never,
    catalogKey,
    draftAsInput
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
  const result = await reconcileFinanceConnections(
    { repository: createFinanceProvisioningRepository() },
    {
      appId: appId ?? null,
      organizationId: body.organization_id ?? null,
      limit: body.limit,
      startingAfter: body.starting_after ?? null,
    }
  )

  return {
    object: 'provisioning_reconciliation' as const,
    examined: result.examined,
    enqueued: result.changed,
    next_cursor: result.nextCursor,
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

async function setupContext(row: repository.SetupRow) {
  const [summaries, organizationCount] = await Promise.all([
    repository.findRevisionSummaries('finance', [row.key]),
    repository.countOrganizationsForSetup(row.key),
  ])
  return {
    publishedRevision:
      summaries.find((s) => s.status === 'published')?.revision ?? null,
    hasDraft: summaries.some((s) => s.status === 'draft'),
    organizationCount,
  }
}

export async function listSetups(): Promise<
  ListObject<ReturnType<typeof serializeSetup>>
> {
  const rows = await repository.listSetups()
  const keys = rows.map((row) => row.key)
  const [summaries, counts] = await Promise.all([
    keys.length ? repository.findRevisionSummaries('finance', keys) : [],
    Promise.all(keys.map((key) => repository.countOrganizationsForSetup(key))),
  ])
  const data = rows.map((row, index) =>
    serializeSetup(row, {
      publishedRevision:
        summaries.find(
          (s) => s.targetKey === row.key && s.status === 'published'
        )?.revision ?? null,
      hasDraft: summaries.some(
        (s) => s.targetKey === row.key && s.status === 'draft'
      ),
      organizationCount: counts[index] ?? 0,
    })
  )
  return listObject({
    data,
    hasMore: false,
    url: '/provisioning/setups',
    totalCount: data.length,
  })
}

async function requireSetup(key: string): Promise<repository.SetupRow> {
  const row = await repository.findSetupByKey(key.trim().toLowerCase())
  if (!row) {
    throw new AppHttpError({
      code: 'provisioning/setup-not-found',
      message: 'Provisioning setup was not found.',
      httpStatus: 404,
    })
  }
  return row
}

async function assertSetupCanBeRemoved(
  setup: repository.SetupRow,
  action: 'archived' | 'removed'
) {
  if (setup.isDefault) {
    throw new AppHttpError({
      code: 'provisioning/setup-default-required',
      message: `The default provisioning setup cannot be ${action}. Make another setup the default first.`,
      httpStatus: 409,
    })
  }

  const organizationCount = await repository.countOrganizationsForSetup(
    setup.key
  )
  if (organizationCount > 0) {
    throw new AppHttpError({
      code: 'provisioning/setup-in-use',
      message: `${organizationCount} organization(s) are provisioned with this setup, so it cannot be ${action}.`,
      httpStatus: 409,
    })
  }
}

export async function retrieveSetup(key: string) {
  const row = await requireSetup(key)
  return serializeSetup(row, await setupContext(row))
}

export async function createSetup(body: {
  key: string
  name: string
  description: string | null
  country_code: string | null
  currency_code: string | null
  is_default: boolean
  copy_from: string | null
}) {
  const existing = await repository.findSetupByKey(body.key)
  if (existing) {
    throw new AppHttpError({
      code: 'provisioning/setup-key-taken',
      message: `Provisioning setup '${body.key}' already exists.`,
      httpStatus: 409,
    })
  }

  if (body.is_default) {
    throw new AppHttpError({
      code: 'provisioning/setup-not-published',
      message:
        'Create and publish the provisioning setup before making it the platform default.',
      httpStatus: 409,
    })
  }

  let initialDraft: ProvisioningDraftReplace = {
    manifest_version: 1,
    reconciliation: 'create_missing',
    preserve_tenant_overrides: true,
    finance_dependency: 'none',
    finance_scopes: [],
    resources: [],
    steps: [],
  }

  if (body.copy_from) {
    const source = await requireSetup(body.copy_from)
    const sourceRevision = await repository.findRevisionByStatus(
      'finance',
      source.key,
      'published'
    )
    if (!sourceRevision) {
      throw new AppHttpError({
        code: 'provisioning/setup-source-unavailable',
        message:
          'The requested source setup does not have a published finance manifest.',
        httpStatus: 422,
      })
    }
    initialDraft = revisionAsDraft(sourceRevision as never)
  }

  const now = nowUnixSeconds()
  const created = await repository.createSetup({
    key: body.key,
    name: body.name,
    description: body.description,
    countryCode: body.country_code,
    currencyCode: body.currency_code,
    now,
  })

  await repository.replaceDraft('finance', created.key, {
    ...draftForRepository(initialDraft),
    now,
  })

  return serializeSetup(created, await setupContext(created))
}

export async function updateSetup(
  key: string,
  body: {
    name?: string
    description?: string | null
    country_code?: string | null
    currency_code?: string | null
    status?: 'active' | 'archived'
    is_default?: boolean
  }
) {
  const setup = await requireSetup(key)
  const now = nowUnixSeconds()

  if (body.status === 'archived') {
    await assertSetupCanBeRemoved(setup, 'archived')
  }

  if (body.is_default === false && setup.isDefault) {
    throw new AppHttpError({
      code: 'provisioning/setup-default-required',
      message:
        'Exactly one setup is the default. Make another setup the default instead of clearing this one.',
      httpStatus: 409,
    })
  }

  let updated = setup
  const hasFieldEdits =
    body.name !== undefined ||
    body.description !== undefined ||
    body.country_code !== undefined ||
    body.currency_code !== undefined ||
    body.status !== undefined

  if (hasFieldEdits) {
    updated = await repository.updateSetup(setup.id, {
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(body.description === undefined
        ? {}
        : { description: body.description }),
      ...(body.country_code === undefined
        ? {}
        : { countryCode: body.country_code }),
      ...(body.currency_code === undefined
        ? {}
        : { currencyCode: body.currency_code }),
      ...(body.status === undefined ? {} : { status: body.status }),
      now,
    })
  }

  if (body.is_default === true && !updated.isDefault) {
    if (updated.status !== 'active') {
      throw new AppHttpError({
        code: 'provisioning/setup-archived',
        message: 'An archived setup cannot be the platform default.',
        httpStatus: 409,
      })
    }

    const published = await repository.findRevisionByStatus(
      'finance',
      updated.key,
      'published'
    )
    if (!published) {
      throw new AppHttpError({
        code: 'provisioning/setup-not-published',
        message: 'Publish this provisioning setup before making it the default.',
        httpStatus: 409,
      })
    }

    updated = await repository.setDefaultSetup(updated.id, now)
  }

  return serializeSetup(updated, await setupContext(updated))
}

export async function deleteSetup(key: string) {
  const setup = await requireSetup(key)
  await assertSetupCanBeRemoved(setup, 'removed')

  await repository.updateSetup(setup.id, {
    status: 'archived',
    now: nowUnixSeconds(),
  })

  return {
    object: 'provisioning_setup' as const,
    id: setup.id,
    deleted: true as const,
  }
}

export async function purgeSetup(key: string) {
  const setup = await requireSetup(key)
  await assertSetupCanBeRemoved(setup, 'removed')

  await repository.purgeSetup(setup.id, setup.key)

  return {
    object: 'provisioning_setup' as const,
    id: setup.id,
    deleted: true as const,
  }
}
