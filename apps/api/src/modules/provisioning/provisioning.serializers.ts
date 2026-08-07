import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  provisioningCatalogResponseSchema,
  provisioningManifestResponseSchema,
  provisioningNoteResponseSchema,
  provisioningRevisionResponseSchema,
  provisioningRunResponseSchema,
} from './provisioning.schemas'

type CatalogResponse = {
  object: 'provisioning_catalog'
  manifest_version: 1
  target_type: string
  resource_types: unknown[]
}

type RevisionRow = {
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
  provisioningResources: Array<{
    id: string
    resourceType: string
    key: string
    position: number
    provisioningProperties: Array<{
      id: string
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
    id: string
    key: string
    description: string
    position: number
  }>
}

type ManifestRow = {
  id: string
  targetType: string
  targetKey: string
  manifestVersion: number
  createdAt: bigint
  updatedAt: bigint
}

type NoteRow = {
  id: string
  manifestId: string
  body: string
  authorUserId: string | null
  createdAt: bigint
  updatedAt: bigint
}

type RunRow = {
  id: string
  organizationId: string
  appId: string
  subscriptionId: string | null
  outboxEventId: string | null
  trigger: string
  status: string
  manifestVersion: number
  financeRevisionId: string | null
  financeRevision: number | null
  applicationRevisionId: string | null
  applicationRevision: number | null
  attemptCount: number
  availableAt: bigint
  startedAt: bigint | null
  completedAt: bigint | null
  lastError: string | null
  createdAt: bigint
  updatedAt: bigint
  provisioningRunSteps: Array<{
    id: string
    targetType: string
    targetKey: string
    revisionId: string
    revision: number
    stepKey: string
    description: string
    position: number
    status: string
    attemptCount: number
    startedAt: bigint | null
    completedAt: bigint | null
    lastError: string | null
  }>
}

export function serializeRevision(row: RevisionRow) {
  return {
    object: 'provisioning_manifest_revision' as const,
    id: row.id,
    manifest_id: row.manifestId,
    manifest_version: 1 as const,
    revision: row.revision,
    status: row.status as 'draft' | 'published' | 'archived',
    reconciliation: row.reconciliation as 'create_missing',
    preserve_tenant_overrides: row.preserveTenantOverrides,
    finance_dependency: row.financeDependency as 'none' | 'embedded',
    finance_scopes: row.financeScopes,
    resources: [...row.provisioningResources]
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((resource) => ({
        object: 'provisioning_resource' as const,
        id: resource.id,
        resource_type: resource.resourceType,
        key: resource.key,
        position: resource.position,
        properties: [...resource.provisioningProperties]
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((prop) => ({
            object: 'provisioning_property' as const,
            id: prop.id,
            key: prop.key,
            value_type: prop.valueType as never,
            string_value: prop.stringValue,
            integer_value:
              prop.integerValue === null ? null : String(prop.integerValue),
            decimal_value: (prop.decimalValue as string | null) ?? null,
            boolean_value: prop.booleanValue,
            reference_namespace: prop.referenceNamespace,
            reference_key: prop.referenceKey,
          })),
      })),
    steps: [...row.provisioningSteps]
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((step) => ({
        object: 'provisioning_step' as const,
        id: step.id,
        key: step.key,
        description: step.description,
        position: step.position,
      })),
    published_at: nullableFromDbUnixSeconds(row.publishedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeManifest(
  row: ManifestRow,
  published: RevisionRow | null,
  draft: RevisionRow | null
) {
  return {
    object: 'provisioning_manifest' as const,
    id: row.id,
    target_type: row.targetType as never,
    target_key: row.targetKey,
    manifest_version: 1 as const,
    published: published ? serializeRevision(published) : null,
    draft: draft ? serializeRevision(draft) : null,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeNote(row: NoteRow) {
  return {
    object: 'provisioning_note' as const,
    id: row.id,
    manifest_id: row.manifestId,
    body: row.body,
    author_user_id: row.authorUserId,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeRun(row: RunRow) {
  return {
    object: 'provisioning_run' as const,
    id: row.id,
    organization_id: row.organizationId,
    app_id: row.appId,
    subscription_id: row.subscriptionId,
    outbox_event_id: row.outboxEventId,
    trigger: row.trigger as never,
    status: row.status as never,
    manifest_version: 1 as const,
    finance_revision_id: row.financeRevisionId,
    finance_revision: row.financeRevision,
    application_revision_id: row.applicationRevisionId,
    application_revision: row.applicationRevision,
    attempt_count: row.attemptCount,
    available_at: fromDbUnixSeconds(row.availableAt),
    started_at: nullableFromDbUnixSeconds(row.startedAt),
    completed_at: nullableFromDbUnixSeconds(row.completedAt),
    last_error: row.lastError,
    steps: row.provisioningRunSteps.map((step) => ({
      object: 'provisioning_run_step' as const,
      id: step.id,
      target_type: step.targetType as never,
      target_key: step.targetKey,
      revision_id: step.revisionId,
      revision: step.revision,
      step_key: step.stepKey,
      description: step.description,
      position: step.position,
      status: step.status as never,
      attempt_count: step.attemptCount,
      started_at: nullableFromDbUnixSeconds(step.startedAt),
      completed_at: nullableFromDbUnixSeconds(step.completedAt),
      last_error: step.lastError,
    })),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
