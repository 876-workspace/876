import { Prisma } from '../../db/generated/prisma/client.js'
import { prisma } from '../../db/index.js'
import type {
  AutomationEventRow,
  AutomationRuleRow,
  AutomationRunRow,
  NotificationRow,
} from './automation.serializers.js'

export const MAX_EVENT_ATTEMPTS = 5
export const RETRY_BASE_DELAY_SECONDS = 30
export const RETRY_MAX_DELAY_SECONDS = 3600

export function computeRetryDelaySeconds(attemptsAfterIncrement: number): number {
  const delay = RETRY_BASE_DELAY_SECONDS * 2 ** Math.max(0, attemptsAfterIncrement - 1)
  return Math.min(RETRY_MAX_DELAY_SECONDS, delay)
}

export type OutboxEventData = {
  id: string
  tenantId: string
  type: string
  subjectType: string
  subjectId: string
  payload: Prisma.InputJsonValue
  causationDepth: number
  createdAt: bigint
}

/** Minimal Prisma surface needed to append an outbox row inside another module's transaction. */
export type OutboxWriter = {
  automationEvent: {
    create(args: { data: OutboxEventData }): Promise<unknown>
  }
}

/** The shared Prisma client as an outbox writer for sweep-produced events. */
export function directWriter(): OutboxWriter {
  return prisma as unknown as OutboxWriter
}

export async function appendOutboxEvent(
  client: OutboxWriter,
  data: OutboxEventData
): Promise<void> {
  await client.automationEvent.create({ data })
}

export function buildClaimEventsQuery(now: bigint, limit: number): Prisma.Sql {
  return Prisma.sql`SELECT "id", "tenant_id" AS "tenantId", "type", "subject_type" AS "subjectType", "subject_id" AS "subjectId", "payload", "causation_depth" AS "causationDepth", "attempts", "claimed_at" AS "claimedAt", "processed_at" AS "processedAt", "next_attempt_at" AS "nextAttemptAt", "created_at" AS "createdAt" FROM "projects_automation_events" WHERE "processed_at" IS NULL AND "attempts" < ${MAX_EVENT_ATTEMPTS} AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= ${now}) ORDER BY "created_at" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED`
}

export async function claimEvents(
  limit: number,
  now: bigint
): Promise<AutomationEventRow[]> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<AutomationEventRow[]>(
      buildClaimEventsQuery(now, limit)
    )
    if (rows.length > 0) {
      await tx.automationEvent.updateMany({
        where: { id: { in: rows.map((row) => row.id) } },
        data: { claimedAt: now },
      })
    }
    return rows.map((row) => ({
      ...row,
      causationDepth: Number(row.causationDepth),
      attempts: Number(row.attempts),
    }))
  })
}

export async function markEventProcessed(
  eventId: string,
  now: bigint
): Promise<void> {
  await prisma.automationEvent.update({
    where: { id: eventId },
    data: { processedAt: now },
  })
}

export async function recordEventAttempt(
  eventId: string,
  attempts: number,
  nextAttemptAt: bigint | null
): Promise<void> {
  await prisma.automationEvent.update({
    where: { id: eventId },
    data: { attempts, nextAttemptAt },
  })
}

export async function existsEventSince(
  tenantId: string,
  type: string,
  subjectType: string,
  subjectId: string,
  since: bigint
): Promise<boolean> {
  const row = await prisma.automationEvent.findFirst({
    where: { tenantId, type, subjectType, subjectId, createdAt: { gte: since } },
    select: { id: true },
  })
  return row !== null
}

export async function listRules(tenantId: string): Promise<AutomationRuleRow[]> {
  const rows = await prisma.automationRule.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as AutomationRuleRow[]
}

export async function retrieveRule(
  tenantId: string,
  id: string
): Promise<AutomationRuleRow | null> {
  const row = await prisma.automationRule.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
  return (row ?? null) as unknown as AutomationRuleRow | null
}

export async function createRule(data: {
  id: string
  tenantId: string
  projectId: string | null
  name: string
  enabled: boolean
  trigger: string
  conditions: Prisma.InputJsonValue
  actions: Prisma.InputJsonValue
  webhookSecret: Prisma.InputJsonValue | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<AutomationRuleRow> {
  const { webhookSecret, ...rest } = data
  const row = await prisma.automationRule.create({
    data: { ...rest, webhookSecret: webhookSecret ?? Prisma.DbNull },
  })
  return row as unknown as AutomationRuleRow
}

export async function updateRule(
  id: string,
  data: Partial<{
    projectId: string | null
    name: string
    enabled: boolean
    trigger: string
    conditions: Prisma.InputJsonValue
    actions: Prisma.InputJsonValue
    webhookSecret: Prisma.InputJsonValue | null
    updatedAt: bigint
  }>
): Promise<AutomationRuleRow> {
  const { webhookSecret, ...rest } = data
  const row = await prisma.automationRule.update({
    where: { id },
    data: {
      ...rest,
      ...(webhookSecret === undefined
        ? {}
        : { webhookSecret: webhookSecret ?? Prisma.DbNull }),
    },
  })
  return row as unknown as AutomationRuleRow
}

export async function softDeleteRule(id: string, now: bigint): Promise<void> {
  await prisma.automationRule.update({
    where: { id },
    data: { deletedAt: now, updatedAt: now, enabled: false },
  })
}

export async function findRun(
  ruleId: string,
  eventId: string
): Promise<AutomationRunRow | null> {
  const row = await prisma.automationRun.findUnique({
    where: { ruleId_eventId: { ruleId, eventId } },
  })
  return (row ?? null) as unknown as AutomationRunRow | null
}

export async function recordRun(data: {
  id: string
  tenantId: string
  ruleId: string
  eventId: string
  status: string
  errorCode: string | null
  attempt: number
  responseCode: number | null
  startedAt: bigint
  finishedAt: bigint
  durationMs: number
  createdAt: bigint
}): Promise<AutomationRunRow> {
  const row = await prisma.automationRun.upsert({
    where: { ruleId_eventId: { ruleId: data.ruleId, eventId: data.eventId } },
    create: data,
    update: {
      status: data.status,
      errorCode: data.errorCode,
      attempt: data.attempt,
      responseCode: data.responseCode,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      durationMs: data.durationMs,
    },
  })
  return row as unknown as AutomationRunRow
}

export async function listRunsForRule(
  tenantId: string,
  ruleId: string
): Promise<AutomationRunRow[]> {
  const rows = await prisma.automationRun.findMany({
    where: { tenantId, ruleId },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  })
  return rows as unknown as AutomationRunRow[]
}

export async function createNotification(data: {
  id: string
  tenantId: string
  userId: string
  kind: string
  title: string
  subjectType: string | null
  subjectId: string | null
  createdAt: bigint
}): Promise<NotificationRow> {
  const row = await prisma.notification.create({ data })
  return row as unknown as NotificationRow
}

export async function listNotificationsForUser(
  tenantId: string,
  userId: string
): Promise<NotificationRow[]> {
  const rows = await prisma.notification.findMany({
    where: { tenantId, userId },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  })
  return rows as unknown as NotificationRow[]
}

export async function retrieveNotification(
  tenantId: string,
  id: string
): Promise<NotificationRow | null> {
  const row = await prisma.notification.findFirst({ where: { tenantId, id } })
  return (row ?? null) as unknown as NotificationRow | null
}

export async function markNotificationRead(
  id: string,
  readAt: bigint
): Promise<NotificationRow> {
  const row = await prisma.notification.update({
    where: { id },
    data: { readAt },
  })
  return row as unknown as NotificationRow
}

export async function listTenantIdentities(): Promise<
  Array<{ id: string; organizationId: string }>
> {
  return prisma.tenant.findMany({
    select: { id: true, organizationId: true },
  })
}
