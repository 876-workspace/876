import type { Prisma } from '../../db/generated/prisma/client.js'
import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  sealWebhookSecret,
  type SealedValue,
} from '../../platform/secure-field.js'
import {
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import {
  matchesConditions,
  type LayoutCondition,
  type LayoutValues,
} from '../../../../../packages/projects/src/layout-rules.js'
import * as finance from '../finance/index.js'
import * as issues from '../issues/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './automation.repository.js'
import type { OutboxWriter } from './automation.repository.js'
import {
  serializeAutomationRule,
  serializeAutomationRun,
  serializeNotification,
  type NotificationRow,
  type SerializedAutomationRule,
  type SerializedAutomationRun,
  type SerializedNotification,
} from './automation.serializers.js'
import type {
  AutomationTrigger,
  CreateRuleBody,
  TestRuleBody,
  UpdateRuleBody,
} from './automation.schemas.js'
import {
  buildSubjectSnapshot,
  triggerSubjectType,
} from './automation.subjects.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

export const DUE_APPROACHING_WINDOW_SECONDS = 3 * 24 * 3600

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

/**
 * Appends an automation outbox row through another module's transaction
 * client so the event commits atomically with the mutation it describes.
 * Emitting the event outside that transaction would risk describing state
 * that never committed.
 */
export async function appendOutboxEvent(
  client: OutboxWriter,
  input: {
    tenantId: string
    type: AutomationTrigger
    subjectType: 'work-item' | 'phase' | 'time-entry' | 'budget' | 'custom-record'
    subjectId: string
    payload: Record<string, unknown>
    causationDepth?: number
  }
): Promise<void> {
  await repository.appendOutboxEvent(client, {
    id: generateId('automationEvent'),
    tenantId: input.tenantId,
    type: input.type,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    payload: toJson(input.payload),
    causationDepth: input.causationDepth ?? 0,
    createdAt: now(),
  })
}

function ruleConditions(row: { conditions: unknown }): LayoutCondition[] {
  return Array.isArray(row.conditions)
    ? (row.conditions as LayoutCondition[])
    : []
}

export async function listRules(
  organizationId: string
): Promise<ServiceResult<SerializedAutomationRule[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listRules(resolved.tenant.id)
  return { data: rows.map(serializeAutomationRule), error: null }
}

export async function createRule(
  organizationId: string,
  body: CreateRuleBody
): Promise<ServiceResult<SerializedAutomationRule>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const ruleId = generateId('automationRule')
  let sealed: SealedValue | null = null
  if (body.webhookSecret) {
    try {
      sealed = await sealWebhookSecret(
        resolved.tenant.id,
        ruleId,
        body.webhookSecret
      )
    } catch {
      return {
        data: null,
        error: getError('projects/internal-error'),
      }
    }
  }
  const timestamp = now()
  const row = await repository.createRule({
    id: ruleId,
    tenantId: resolved.tenant.id,
    projectId: body.projectId ?? null,
    name: body.name,
    enabled: body.enabled ?? true,
    trigger: body.trigger,
    conditions: toJson(body.conditions ?? []),
    actions: toJson(body.actions),
    webhookSecret: sealed ? toJson({ ...sealed }) : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeAutomationRule(row), error: null }
}

export async function retrieveRule(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedAutomationRule>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveRule(resolved.tenant.id, id)
  if (!row)
    return {
      data: null,
      error: getError('projects/automation-rule-not-found'),
    }
  return { data: serializeAutomationRule(row), error: null }
}

export async function updateRule(
  organizationId: string,
  id: string,
  body: UpdateRuleBody
): Promise<ServiceResult<SerializedAutomationRule>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveRule(resolved.tenant.id, id)
  if (!existing)
    return {
      data: null,
      error: getError('projects/automation-rule-not-found'),
    }
  let sealed: SealedValue | null | undefined
  if (body.webhookSecret !== undefined) {
    if (body.webhookSecret === null) sealed = null
    else {
      try {
        sealed = await sealWebhookSecret(
          resolved.tenant.id,
          existing.id,
          body.webhookSecret
        )
      } catch {
        return { data: null, error: getError('projects/internal-error') }
      }
    }
  }
  const row = await repository.updateRule(existing.id, {
    ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
    ...(body.conditions !== undefined
      ? { conditions: toJson(body.conditions) }
      : {}),
    ...(body.actions !== undefined ? { actions: toJson(body.actions) } : {}),
    ...(sealed !== undefined
      ? { webhookSecret: sealed ? toJson({ ...sealed }) : null }
      : {}),
    updatedAt: now(),
  })
  return { data: serializeAutomationRule(row), error: null }
}

export async function removeRule(
  organizationId: string,
  id: string
): Promise<
  ServiceResult<{ object: 'projects.automation-rule'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveRule(resolved.tenant.id, id)
  if (!existing)
    return {
      data: null,
      error: getError('projects/automation-rule-not-found'),
    }
  await repository.softDeleteRule(existing.id, now())
  return {
    data: { object: 'projects.automation-rule', id: existing.id, deleted: true },
    error: null,
  }
}

export async function listRuns(
  organizationId: string,
  ruleId: string
): Promise<ServiceResult<SerializedAutomationRun[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rule = await repository.retrieveRule(resolved.tenant.id, ruleId)
  if (!rule)
    return {
      data: null,
      error: getError('projects/automation-rule-not-found'),
    }
  const rows = await repository.listRunsForRule(resolved.tenant.id, ruleId)
  return { data: rows.map(serializeAutomationRun), error: null }
}

export type DryRunResult = {
  object: 'projects.automation-test'
  ruleId: string
  subjectType: string
  subjectId: string
  matched: boolean
  conditions: Array<{ fieldKey: string; op: string; matched: boolean }>
  plannedActions: Array<{ type: string }>
}

export async function testRule(
  organizationId: string,
  ruleId: string,
  body: TestRuleBody & { projectId?: string }
): Promise<ServiceResult<DryRunResult>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rule = await repository.retrieveRule(resolved.tenant.id, ruleId)
  if (!rule)
    return {
      data: null,
      error: getError('projects/automation-rule-not-found'),
    }
  const subjectType = triggerSubjectType(
    rule.trigger as AutomationTrigger
  )
  const snapshot = await buildSubjectSnapshot(
    organizationId,
    subjectType,
    body.subjectId,
    body.projectId
  )
  if (snapshot.error || !snapshot.snapshot)
    return { data: null, error: snapshot.error }
  const conditions = ruleConditions(rule)
  const values: LayoutValues = snapshot.snapshot.values
  const perCondition = conditions.map((condition) => ({
    fieldKey: condition.fieldKey,
    op: condition.op,
    matched: matchesConditions([condition], values),
  }))
  const matched = matchesConditions(conditions, values)
  const actions = Array.isArray(rule.actions)
    ? (rule.actions as Array<{ type?: unknown }>)
    : []
  return {
    data: {
      object: 'projects.automation-test',
      ruleId: rule.id,
      subjectType,
      subjectId: snapshot.snapshot.subjectId,
      matched,
      conditions: perCondition,
      plannedActions: actions.map((action) => ({
        type: typeof action.type === 'string' ? action.type : 'unknown',
      })),
    },
    error: null,
  }
}

export async function createNotificationRecord(
  tenantId: string,
  input: {
    userId: string
    kind: string
    title: string
    subjectType?: string | null
    subjectId?: string | null
  }
): Promise<NotificationRow> {
  return repository.createNotification({
    id: generateId('notification'),
    tenantId,
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    subjectType: input.subjectType ?? null,
    subjectId: input.subjectId ?? null,
    createdAt: now(),
  })
}

export async function listNotifications(
  organizationId: string,
  userId: string
): Promise<ServiceResult<SerializedNotification[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listNotificationsForUser(
    resolved.tenant.id,
    userId
  )
  return { data: rows.map(serializeNotification), error: null }
}

export async function readNotification(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedNotification>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveNotification(
    resolved.tenant.id,
    id
  )
  if (!existing)
    return { data: null, error: getError('projects/notification-not-found') }
  if (existing.readAt !== null)
    return { data: serializeNotification(existing), error: null }
  const row = await repository.markNotificationRead(existing.id, now())
  return { data: serializeNotification(row), error: null }
}

function startOfUtcDayUnixSeconds(nowSeconds: number): number {
  return Math.floor(nowSeconds / 86400) * 86400
}

async function sweepDueApproaching(
  tenantId: string,
  organizationId: string,
  nowSeconds: number
): Promise<number> {
  const due = await issues.listDueSoon(
    organizationId,
    nowSeconds,
    nowSeconds + DUE_APPROACHING_WINDOW_SECONDS
  )
  if (due.error || !due.data) return 0
  let produced = 0
  const dayStart = toDbUnixSeconds(startOfUtcDayUnixSeconds(nowSeconds))
  for (const item of due.data) {
    const seen = await repository.existsEventSince(
      tenantId,
      'due-date.approaching',
      'work-item',
      item.id,
      dayStart
    )
    if (seen) continue
    await repository.appendOutboxEvent(repository.directWriter(), {
      id: generateId('automationEvent'),
      tenantId,
      type: 'due-date.approaching',
      subjectType: 'work-item',
      subjectId: item.id,
      payload: toJson({
        organizationId,
        projectId: item.projectId,
        dueDate: item.dueDate,
      }),
      causationDepth: 0,
      createdAt: toDbUnixSeconds(nowSeconds),
    })
    produced += 1
  }
  return produced
}

async function sweepBudgetThreshold(
  tenantId: string,
  organizationId: string,
  nowSeconds: number
): Promise<number> {
  let produced = 0
  const dayStart = toDbUnixSeconds(startOfUtcDayUnixSeconds(nowSeconds))
  let startingAfter: string | undefined
  for (;;) {
    const page = await projects.list(organizationId, {
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    if (page.error || !page.data) return produced
    for (const project of page.data.items) {
      const summary = await finance.getFinancialSummary(
        organizationId,
        project.id,
        { from: 0, to: nowSeconds }
      )
      if (summary.error || !summary.data) continue
      for (const budget of summary.data.budgets) {
        if (!budget.overThreshold) continue
        const seen = await repository.existsEventSince(
          tenantId,
          'budget.threshold-reached',
          'budget',
          budget.budgetId,
          dayStart
        )
        if (seen) continue
        await repository.appendOutboxEvent(repository.directWriter(), {
          id: generateId('automationEvent'),
          tenantId,
          type: 'budget.threshold-reached',
          subjectType: 'budget',
          subjectId: budget.budgetId,
          payload: toJson({
            organizationId,
            projectId: project.id,
            percent: budget.percent,
          }),
          causationDepth: 0,
          createdAt: toDbUnixSeconds(nowSeconds),
        })
        produced += 1
      }
    }
    if (!page.data.hasMore) break
    const items = page.data.items
    startingAfter = items[items.length - 1]?.id
    if (!startingAfter) break
  }
  return produced
}

export type SweepCounts = {
  tenants: number
  dueApproaching: number
  budgetThreshold: number
}

export async function sweepAutomationEvents(
  nowSeconds: number = nowUnixSeconds()
): Promise<SweepCounts> {
  const identities = await repository.listTenantIdentities()
  const counts: SweepCounts = {
    tenants: identities.length,
    dueApproaching: 0,
    budgetThreshold: 0,
  }
  for (const identity of identities) {
    counts.dueApproaching += await sweepDueApproaching(
      identity.id,
      identity.organizationId,
      nowSeconds
    )
    counts.budgetThreshold += await sweepBudgetThreshold(
      identity.id,
      identity.organizationId,
      nowSeconds
    )
  }
  return counts
}
