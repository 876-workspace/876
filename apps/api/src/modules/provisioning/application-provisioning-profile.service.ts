import {
  APPLICATION_PROVISIONING_PROFILE_CONDITION_FIELDS,
  type ApplicationProvisioningProfile,
  type ApplicationProvisioningProfileCondition,
  type ApplicationProvisioningProfileConditionField,
  type ApplicationProvisioningProfileSelection,
  type ApplicationProvisioningProfileSelectionCandidate,
  type ApplicationProvisioningProfileSelectionContext,
  type PersistedApplicationProvisioningProfileSelection,
} from '@876/core/types/application-provisioning-profile'

import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { validateProvisioningWireDraft } from '@/services/provisioning-catalog'

import * as repository from './application-provisioning-profile.repository'
import * as manifestRepository from './provisioning.repository'
import { serializeManifest, serializeRevision } from './provisioning.serializers'
import type {
  ApplicationProvisioningProfileCreate,
  ApplicationProvisioningProfilePolicyReplace,
  ApplicationProvisioningProfileUpdate,
} from './application-provisioning-profile.schemas'
import type { ProvisioningDraftReplace } from './provisioning.schemas'

type ProfileRow = NonNullable<
  Awaited<ReturnType<typeof repository.findProfileById>>
>

type CandidateMatch = {
  candidate: ApplicationProvisioningProfileSelectionCandidate
  groupKey: string
  priority: number
  fields: ApplicationProvisioningProfileConditionField[]
}

function notFound(message = 'Application provisioning profile was not found.') {
  return new AppHttpError({
    code: 'provisioning/application-profile-not-found',
    message,
    httpStatus: 404,
  })
}

async function requireApp(appKey: string) {
  const app = await repository.findAppByIdOrSlug(appKey)
  if (!app)
    throw new AppHttpError({
      code: 'provisioning/target-not-found',
      message: 'Provisioning application target was not found.',
      httpStatus: 404,
    })

  return app
}

async function requireProfile(appKey: string, profileKey: string) {
  const app = await requireApp(appKey)
  await repository.ensureDefaultProfile(app.id, BigInt(nowUnixSeconds()))
  const profile = await repository.findProfile(app.id, profileKey)
  if (!profile) throw notFound()

  return { app, profile: profile as ProfileRow }
}

function serializeCondition(
  condition: ProfileRow['conditions'][number]
): ApplicationProvisioningProfileCondition {
  return {
    object: 'application_provisioning_profile_condition',
    id: condition.id,
    group_key: condition.groupKey,
    field: condition.field as ApplicationProvisioningProfileConditionField,
    operator: 'equals',
    value: condition.value,
    priority: condition.priority,
    created_at: Number(condition.createdAt),
    updated_at: Number(condition.updatedAt),
  }
}

async function serializeProfiles(
  rows: ProfileRow[]
): Promise<ApplicationProvisioningProfile[]> {
  const states = new Map<
    string,
    { publishedRevision: number | null; hasDraft: boolean }
  >()
  const manifestRows = await repository.findManifestState(
    rows.map((row) => row.manifestTargetKey)
  )
  for (const revision of manifestRows) {
    const key = revision.provisioningManifest.targetKey
    const state = states.get(key) ?? {
      publishedRevision: null,
      hasDraft: false,
    }
    if (revision.status === 'published') state.publishedRevision = revision.revision
    if (revision.status === 'draft') state.hasDraft = true
    states.set(key, state)
  }

  return rows.map((row) => {
    const state = states.get(row.manifestTargetKey)
    return {
      object: 'application_provisioning_profile' as const,
      id: row.id,
      app_id: row.appId,
      app_slug: row.app.slug,
      key: row.key,
      name: row.name,
      description: row.description,
      status: row.status as ApplicationProvisioningProfile['status'],
      is_default: row.isDefault,
      manifest_target: `application/${row.app.slug}/profiles/${row.key}`,
      published_revision: state?.publishedRevision ?? null,
      has_draft: state?.hasDraft ?? false,
      selection_count: row._count.selections,
      conditions: row.conditions.map(serializeCondition),
      created_at: Number(row.createdAt),
      updated_at: Number(row.updatedAt),
    }
  })
}

async function serializeProfile(row: ProfileRow) {
  return (await serializeProfiles([row]))[0]!
}

export async function ensureDefaultApplicationProvisioningProfile(
  appKey: string
): Promise<ApplicationProvisioningProfile> {
  const app = await requireApp(appKey)
  await repository.ensureDefaultProfile(app.id, BigInt(nowUnixSeconds()))
  const profile = await repository.findDefaultProfile(app.id)
  if (!profile) throw new Error('Default application profile disappeared')

  return serializeProfile(profile as ProfileRow)
}

export async function listApplicationProvisioningProfiles(appKey: string) {
  const app = await requireApp(appKey)
  await repository.ensureDefaultProfile(app.id, BigInt(nowUnixSeconds()))
  return serializeProfiles((await repository.listProfiles(app.id)) as ProfileRow[])
}

export async function retrieveApplicationProvisioningProfile(
  appKey: string,
  profileKey: string
) {
  const { profile } = await requireProfile(appKey, profileKey)
  return serializeProfile(profile)
}

function revisionAsRepositoryDraft(
  revision: NonNullable<
    Awaited<ReturnType<typeof repository.findPublishedRevision>>
  >,
  now: number
) {
  return {
    reconciliation: revision.reconciliation,
    preserveTenantOverrides: revision.preserveTenantOverrides,
    financeDependency: revision.financeDependency,
    financeScopes: revision.financeScopes,
    resources: revision.provisioningResources.map((resource) => ({
      resourceType: resource.resourceType,
      key: resource.key,
      position: resource.position,
      properties: resource.provisioningProperties.map((property) => ({
        key: property.key,
        valueType: property.valueType,
        stringValue: property.stringValue,
        integerValue:
          property.integerValue === null ? null : Number(property.integerValue),
        decimalValue:
          property.decimalValue === null ? null : String(property.decimalValue),
        booleanValue: property.booleanValue,
        referenceNamespace: property.referenceNamespace,
        referenceKey: property.referenceKey,
      })),
    })),
    steps: revision.provisioningSteps.map((step) => ({
      key: step.key,
      description: step.description,
      position: step.position,
    })),
    now,
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

function revisionAsWireDraft(row: {
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
    resources: row.provisioningResources.map((resource) => ({
      resource_type: resource.resourceType,
      key: resource.key,
      position: resource.position,
      properties: resource.provisioningProperties.map((property) => ({
        key: property.key,
        value_type: property.valueType as never,
        string_value: property.stringValue,
        integer_value:
          property.integerValue === null ? null : Number(property.integerValue),
        decimal_value:
          property.decimalValue === null ? null : String(property.decimalValue),
        boolean_value: property.booleanValue,
        reference_namespace: property.referenceNamespace,
        reference_key: property.referenceKey,
      })),
    })),
    steps: row.provisioningSteps.map((step) => ({
      key: step.key,
      description: step.description,
      position: step.position,
    })),
  }
}

function validateManifestDraft(appSlug: string, body: ProvisioningDraftReplace) {
  return validateProvisioningWireDraft('application', appSlug, body)
}

export async function retrieveApplicationProvisioningProfileManifest(
  appKey: string,
  profileKey: string
) {
  const { profile } = await requireProfile(appKey, profileKey)
  const manifest = await manifestRepository.findManifestFirst(
    'application',
    profile.manifestTargetKey
  )
  if (!manifest)
    throw new AppHttpError({
      code: 'provisioning/manifest-not-found',
      message: 'Provisioning manifest was not found.',
      httpStatus: 404,
    })

  const [published, draft] = await Promise.all([
    manifestRepository.findRevisionByStatus(
      'application',
      profile.manifestTargetKey,
      'published'
    ),
    manifestRepository.findRevisionByStatus(
      'application',
      profile.manifestTargetKey,
      'draft'
    ),
  ])
  return serializeManifest(manifest as never, published as never, draft as never)
}

export async function retrieveApplicationProvisioningProfilePublished(
  appKey: string,
  profileKey: string
) {
  const { profile } = await requireProfile(appKey, profileKey)
  const revision = await manifestRepository.findRevisionByStatus(
    'application',
    profile.manifestTargetKey,
    'published'
  )
  if (!revision)
    throw new AppHttpError({
      code: 'provisioning/published-revision-not-found',
      message: 'Published provisioning revision was not found.',
      httpStatus: 404,
    })

  return serializeRevision(revision as never)
}

export async function validateApplicationProvisioningProfileDraft(
  appKey: string,
  profileKey: string,
  body: ProvisioningDraftReplace
) {
  const { app } = await requireProfile(appKey, profileKey)
  const issues = validateManifestDraft(app.slug, body)
  return {
    object: 'provisioning_validation' as const,
    valid: issues.length === 0,
    issues,
  }
}

export async function replaceApplicationProvisioningProfileDraft(
  appKey: string,
  profileKey: string,
  body: ProvisioningDraftReplace
) {
  const { app, profile } = await requireProfile(appKey, profileKey)
  const issues = validateManifestDraft(app.slug, body)
  const blocking = issues.filter(
    (issue) => !['resource_minimum', 'unresolved_reference'].includes(issue.code)
  )
  if (blocking.length > 0)
    throw new AppHttpError({
      code: 'provisioning/invalid-draft',
      message: `${blocking[0]!.path}: ${blocking[0]!.message}`,
      httpStatus: 422,
    })

  const revision = await manifestRepository.replaceDraft(
    'application',
    profile.manifestTargetKey,
    { ...draftForRepository(body), now: nowUnixSeconds() }
  )
  return serializeRevision(revision as never)
}

export async function publishApplicationProvisioningProfileDraft(
  appKey: string,
  profileKey: string
) {
  const { app, profile } = await requireProfile(appKey, profileKey)
  const locked = await manifestRepository.retrieveDraftForUpdate(
    'application',
    profile.manifestTargetKey
  )
  if (!locked)
    throw new AppHttpError({
      code: 'provisioning/draft-not-found',
      message: 'Provisioning draft was not found.',
      httpStatus: 404,
    })

  const issues = validateManifestDraft(
    app.slug,
    revisionAsWireDraft(locked.draft as never)
  )
  if (issues.length > 0)
    throw new AppHttpError({
      code: 'provisioning/invalid-draft',
      message: `${issues[0]!.path}: ${issues[0]!.message}`,
      httpStatus: 422,
    })

  const published = await manifestRepository.promoteDraft(
    locked.manifest as never,
    locked.draft as never,
    nowUnixSeconds()
  )
  return serializeRevision(published as never)
}

export async function createApplicationProvisioningProfile(
  appKey: string,
  body: ApplicationProvisioningProfileCreate
): Promise<ApplicationProvisioningProfile> {
  const app = await requireApp(appKey)
  await repository.ensureDefaultProfile(app.id, BigInt(nowUnixSeconds()))
  if (body.is_default)
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-create-not-supported',
      message:
        'Create and publish the application profile before making it the default.',
      httpStatus: 409,
    })
  if (await repository.findProfile(app.id, body.key))
    throw new AppHttpError({
      code: 'provisioning/application-profile-key-exists',
      message: 'An application provisioning profile with this key already exists.',
      httpStatus: 409,
    })

  let copyRevision: Awaited<ReturnType<typeof repository.findPublishedRevision>> =
    null
  if (body.copy_from) {
    const source = await repository.findProfile(app.id, body.copy_from)
    if (!source) throw notFound('The source application profile was not found.')
    copyRevision = await repository.findPublishedRevision(source.manifestTargetKey)
    if (!copyRevision)
      throw new AppHttpError({
        code: 'provisioning/application-profile-copy-source-unpublished',
        message: 'The source application profile has no published manifest.',
        httpStatus: 409,
      })
  }

  const now = nowUnixSeconds()
  const profileId = generateId('applicationProvisioningProfile')
  const created = await repository.createProfile({
    id: profileId,
    appId: app.id,
    key: body.key,
    name: body.name,
    description: body.description ?? null,
    isDefault: false,
    status: 'draft',
    manifestTargetKey: profileId,
    now: BigInt(now),
  })
  if (copyRevision)
    await manifestRepository.replaceDraft(
      'application',
      created.manifestTargetKey,
      revisionAsRepositoryDraft(copyRevision, now)
    )

  const profile = await repository.findProfileById(created.id)
  if (!profile) throw new Error('Created application profile could not be reloaded')
  return serializeProfile(profile as ProfileRow)
}

async function validateActivation(profile: ProfileRow) {
  if (profile.isDefault) return
  if (profile.conditions.length === 0)
    throw new AppHttpError({
      code: 'provisioning/application-profile-conditions-required',
      message:
        'A non-default application profile requires routing conditions before activation.',
      httpStatus: 409,
    })
  if (!(await repository.findPublishedRevision(profile.manifestTargetKey)))
    throw new AppHttpError({
      code: 'provisioning/application-profile-published-manifest-required',
      message:
        'A non-default application profile requires a published manifest before activation.',
      httpStatus: 409,
    })
}

async function validateDefaultPromotion(
  profile: ProfileRow,
  nextStatus: string
) {
  if (profile.conditions.length > 0)
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-has-conditions',
      message: 'The default application provisioning profile cannot have conditions.',
      httpStatus: 409,
    })
  if (nextStatus === 'archived')
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-required',
      message: 'An archived application provisioning profile cannot become default.',
      httpStatus: 409,
    })
  if (!(await repository.findPublishedRevision(profile.manifestTargetKey)))
    throw new AppHttpError({
      code: 'provisioning/application-profile-published-manifest-required',
      message:
        'Publish the application provisioning profile before making it the default.',
      httpStatus: 409,
    })
}

export async function updateApplicationProvisioningProfile(
  appKey: string,
  profileKey: string,
  body: ApplicationProvisioningProfileUpdate
) {
  const { app, profile } = await requireProfile(appKey, profileKey)
  if (body.is_default === false && profile.isDefault)
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-required',
      message: 'Choose another default profile instead of removing the current default.',
      httpStatus: 409,
    })
  if (
    profile.isDefault &&
    body.status !== undefined &&
    body.status !== 'active'
  )
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-required',
      message: 'The default application provisioning profile must remain active.',
      httpStatus: 409,
    })
  if (body.is_default === true && !profile.isDefault)
    await validateDefaultPromotion(profile, body.status ?? profile.status)
  if (
    body.status === 'active' &&
    !profile.isDefault &&
    body.is_default !== true
  )
    await validateActivation(profile)

  const now = BigInt(nowUnixSeconds())
  const update: {
    name?: string
    description?: string | null
    status?: 'draft' | 'active' | 'archived'
    updatedAt: bigint
  } = { updatedAt: now }
  if (body.name !== undefined) update.name = body.name
  if (body.description !== undefined) update.description = body.description
  if (body.status !== undefined) update.status = body.status
  await repository.updateProfile(profile.id, update)
  if (body.is_default === true && !profile.isDefault)
    await repository.makeDefaultProfile({ appId: app.id, profileId: profile.id, now })

  const refreshed = await repository.findProfileById(profile.id)
  if (!refreshed) throw new Error('Updated application profile disappeared')
  return serializeProfile(refreshed as ProfileRow)
}

async function validatePolicyReferences(
  appId: string,
  body: ApplicationProvisioningProfilePolicyReplace
) {
  for (const condition of body.conditions) {
    if (condition.field === 'setup') {
      const setup = await repository.findProvisioningSetupByKey(condition.value)
      if (!setup || setup.status !== 'active')
        throw new AppHttpError({
          code: 'provisioning/application-profile-invalid-setup',
          message: `Provisioning setup ${condition.value} is not active.`,
          httpStatus: 422,
        })
    }
    if (condition.field === 'plan') {
      const product = await repository.findProductForApp(appId, condition.value)
      if (!product)
        throw new AppHttpError({
          code: 'provisioning/application-profile-invalid-plan',
          message: `Plan ${condition.value} is not an active product for this app.`,
          httpStatus: 422,
        })
    }
  }
}

export async function retrieveApplicationProvisioningProfilePolicy(
  appKey: string,
  profileKey: string
) {
  const { app, profile } = await requireProfile(appKey, profileKey)
  const conditions = profile.conditions.map(serializeCondition)
  return {
    object: 'application_provisioning_profile_policy' as const,
    app_id: app.id,
    app_slug: app.slug,
    profile_id: profile.id,
    profile_key: profile.key,
    conditions,
    updated_at: Math.max(
      Number(profile.updatedAt),
      ...conditions.map((condition) => condition.updated_at)
    ),
  }
}

export async function replaceApplicationProvisioningProfilePolicy(
  appKey: string,
  profileKey: string,
  body: ApplicationProvisioningProfilePolicyReplace
) {
  const { app, profile } = await requireProfile(appKey, profileKey)
  if (profile.isDefault && body.conditions.length > 0)
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-has-conditions',
      message: 'The default application provisioning profile cannot have conditions.',
      httpStatus: 409,
    })

  await validatePolicyReferences(app.id, body)
  await repository.replaceConditions(
    profile.id,
    body.conditions.map((condition) => ({
      id: generateId('applicationProvisioningProfileCondition'),
      groupKey: condition.group_key,
      field: condition.field,
      operator: 'equals' as const,
      value: condition.value,
      priority: condition.priority,
    })),
    BigInt(nowUnixSeconds())
  )
  return retrieveApplicationProvisioningProfilePolicy(app.id, profile.id)
}

function normalizedContext(
  context: Partial<ApplicationProvisioningProfileSelectionContext>
): ApplicationProvisioningProfileSelectionContext {
  return {
    setup: context.setup?.trim().toLowerCase() || null,
    country: context.country?.trim().toUpperCase() || null,
    subdivision: context.subdivision?.trim().toUpperCase() || null,
    jurisdiction: context.jurisdiction?.trim() || null,
    plan: context.plan?.trim().toLowerCase() || null,
  }
}

function contextValue(
  context: ApplicationProvisioningProfileSelectionContext,
  field: ApplicationProvisioningProfileConditionField
): string | null {
  if (field === 'setup') return context.setup
  if (field === 'country') return context.country
  if (field === 'subdivision') return context.subdivision
  if (field === 'jurisdiction') return context.jurisdiction
  return context.plan
}

function compareMatches(left: CandidateMatch, right: CandidateMatch) {
  if (left.fields.length !== right.fields.length)
    return right.fields.length - left.fields.length
  if (left.priority !== right.priority) return right.priority - left.priority
  const profile = left.candidate.key.localeCompare(right.candidate.key)
  return profile !== 0 ? profile : left.groupKey.localeCompare(right.groupKey)
}

function canonicalMatchedFields(
  conditions: ApplicationProvisioningProfileCondition[]
): ApplicationProvisioningProfileConditionField[] {
  const fields = new Set(conditions.map((condition) => condition.field))
  return APPLICATION_PROVISIONING_PROFILE_CONDITION_FIELDS.filter((field) =>
    fields.has(field)
  )
}

function bestMatchForCandidate(
  candidate: ApplicationProvisioningProfileSelectionCandidate,
  context: ApplicationProvisioningProfileSelectionContext
): CandidateMatch | null {
  if (candidate.is_default) return null
  const groups = new Map<string, ApplicationProvisioningProfileCondition[]>()
  for (const condition of candidate.conditions) {
    const group = groups.get(condition.group_key) ?? []
    group.push(condition)
    groups.set(condition.group_key, group)
  }

  const matches: CandidateMatch[] = []
  for (const [groupKey, conditions] of groups) {
    if (conditions.length === 0) continue
    if (
      !conditions.every((condition) => {
        const actual = contextValue(context, condition.field)
        return actual !== null && actual === condition.value
      })
    )
      continue
    matches.push({
      candidate,
      groupKey,
      priority: Math.max(...conditions.map((condition) => condition.priority)),
      fields: canonicalMatchedFields(conditions),
    })
  }
  matches.sort(compareMatches)
  return matches[0] ?? null
}

export function resolveApplicationProvisioningProfileFromCandidates(
  candidates: ApplicationProvisioningProfileSelectionCandidate[],
  rawContext: Partial<ApplicationProvisioningProfileSelectionContext>
): ApplicationProvisioningProfileSelection {
  const context = normalizedContext(rawContext)
  const first = candidates[0]
  if (!first)
    throw new AppHttpError({
      code: 'provisioning/application-profile-unavailable',
      message: 'No active application provisioning profile is available.',
      httpStatus: 503,
    })
  if (
    candidates.some(
      (candidate) =>
        candidate.app_id !== first.app_id || candidate.app_slug !== first.app_slug
    )
  )
    throw new AppHttpError({
      code: 'provisioning/application-profile-candidate-invalid',
      message: 'Application profile candidates must belong to one application.',
      httpStatus: 500,
    })

  const defaults = candidates.filter((candidate) => candidate.is_default)
  if (defaults.length !== 1 || defaults[0]!.conditions.length > 0)
    throw new AppHttpError({
      code: 'provisioning/application-profile-default-invalid',
      message:
        'Application profile selection requires exactly one active, location-neutral default profile.',
      httpStatus: 500,
    })

  const match = candidates
    .map((candidate) => bestMatchForCandidate(candidate, context))
    .filter((candidate): candidate is CandidateMatch => candidate !== null)
    .sort(compareMatches)[0]
  if (match)
    return {
      app_id: match.candidate.app_id,
      app_slug: match.candidate.app_slug,
      profile_id: match.candidate.id,
      profile_key: match.candidate.key,
      match_type: 'policy',
      match_group_key: match.groupKey,
      match_priority: match.priority,
      matched_fields: match.fields,
      context,
    }

  const fallback = defaults[0]!
  return {
    app_id: fallback.app_id,
    app_slug: fallback.app_slug,
    profile_id: fallback.id,
    profile_key: fallback.key,
    match_type: 'default',
    match_group_key: null,
    match_priority: null,
    matched_fields: [],
    context,
  }
}

function serializeCandidate(
  row: Awaited<ReturnType<typeof repository.listActiveProfiles>>[number]
): ApplicationProvisioningProfileSelectionCandidate {
  return {
    id: row.id,
    app_id: row.appId,
    app_slug: row.app.slug,
    key: row.key,
    is_default: row.isDefault,
    conditions: row.conditions.map((condition) => ({
      object: 'application_provisioning_profile_condition' as const,
      id: condition.id,
      group_key: condition.groupKey,
      field: condition.field as ApplicationProvisioningProfileConditionField,
      operator: 'equals' as const,
      value: condition.value,
      priority: condition.priority,
      created_at: Number(condition.createdAt),
      updated_at: Number(condition.updatedAt),
    })),
  }
}

function serializePersisted(
  row: NonNullable<Awaited<ReturnType<typeof repository.findPersistedSelection>>>
): PersistedApplicationProvisioningProfileSelection {
  return {
    organization_id: row.organizationId,
    app_id: row.appId,
    app_slug: row.app.slug,
    profile_id: row.profileId,
    profile_key: row.profile.key,
    selection_type:
      row.selectionType as PersistedApplicationProvisioningProfileSelection['selection_type'],
    match_group_key: row.matchGroupKey,
    match_priority: row.matchPriority,
    matched_fields:
      row.matchedFields as ApplicationProvisioningProfileConditionField[],
    selected_at: Number(row.selectedAt),
  }
}

export async function retrievePersistedApplicationProvisioningProfileSelection(
  organizationId: string,
  appKey: string
) {
  const app = await requireApp(appKey)
  const row = await repository.findPersistedSelection(organizationId, app.id)
  return row ? serializePersisted(row) : null
}

export async function requirePersistedApplicationProvisioningProfileSelection(
  organizationId: string,
  appKey: string
) {
  const selection =
    await retrievePersistedApplicationProvisioningProfileSelection(
      organizationId,
      appKey
    )
  if (!selection)
    throw new AppHttpError({
      code: 'provisioning/application-profile-selection-missing',
      message:
        'The organization has no persisted provisioning profile for this application.',
      httpStatus: 409,
    })
  return selection
}

export async function buildApplicationProvisioningSelectionContext(
  organizationId: string,
  appId: string
): Promise<ApplicationProvisioningProfileSelectionContext> {
  const organization = await repository.findOrganizationSelectionContext(
    organizationId,
    appId
  )
  if (!organization)
    throw new AppHttpError({
      code: 'organization/not-found',
      message: 'Organization was not found.',
      httpStatus: 404,
    })

  return normalizedContext({
    setup: organization.provisioningSetupKey,
    country: organization.countryCode,
    subdivision: organization.region?.code ?? null,
    jurisdiction: null,
    plan:
      organization.subscriptions[0]?.subscriptionItems[0]?.price.product.slug ??
      null,
  })
}

export async function resolveAndPersistApplicationProvisioningProfile(
  organizationId: string,
  appKey: string,
  now = nowUnixSeconds()
): Promise<ApplicationProvisioningProfileSelection> {
  const app = await requireApp(appKey)
  const context = await buildApplicationProvisioningSelectionContext(
    organizationId,
    app.id
  )
  const existing = await repository.findPersistedSelection(
    organizationId,
    app.id
  )
  if (existing)
    return {
      app_id: existing.appId,
      app_slug: existing.app.slug,
      profile_id: existing.profileId,
      profile_key: existing.profile.key,
      match_type: 'persisted',
      match_group_key: existing.matchGroupKey,
      match_priority: existing.matchPriority,
      matched_fields:
        existing.matchedFields as ApplicationProvisioningProfileConditionField[],
      context,
    }
  if (!context.setup)
    throw new AppHttpError({
      code: 'provisioning/setup-selection-missing',
      message:
        'The organization needs a persisted provisioning setup before app profile selection.',
      httpStatus: 409,
    })

  await repository.ensureDefaultProfile(app.id, BigInt(now))
  const selection = resolveApplicationProvisioningProfileFromCandidates(
    (await repository.listActiveProfiles(app.id)).map(serializeCandidate),
    context
  )
  const inserted = await repository.persistSelection({
    id: generateId('organizationApplicationProvisioning'),
    organizationId,
    appId: app.id,
    profileId: selection.profile_id,
    selectionType: selection.match_type === 'policy' ? 'policy' : 'default',
    matchGroupKey: selection.match_group_key,
    matchPriority: selection.match_priority,
    matchedFields: selection.matched_fields,
    selectedAt: BigInt(now),
  })
  if (inserted) return selection

  const winner = await repository.findPersistedSelection(organizationId, app.id)
  if (!winner)
    throw new Error('Application profile selection race lost without a winner')
  return {
    app_id: winner.appId,
    app_slug: winner.app.slug,
    profile_id: winner.profileId,
    profile_key: winner.profile.key,
    match_type: 'persisted',
    match_group_key: winner.matchGroupKey,
    match_priority: winner.matchPriority,
    matched_fields:
      winner.matchedFields as ApplicationProvisioningProfileConditionField[],
    context,
  }
}

export async function resolveDefaultApplicationManifestTarget(appKey: string) {
  const app = await requireApp(appKey)
  const profile = await repository.ensureDefaultProfile(
    app.id,
    BigInt(nowUnixSeconds())
  )
  return { app, profile, manifestTargetKey: profile.manifestTargetKey }
}

export async function resolveApplicationManifestTarget(
  appKey: string,
  profileKey: string
) {
  const { app, profile } = await requireProfile(appKey, profileKey)
  return { app, profile, manifestTargetKey: profile.manifestTargetKey }
}
