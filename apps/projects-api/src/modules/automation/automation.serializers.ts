import type { SealedValue } from '../../platform/secure-field.js'
import type {
  AutomationAction,
  AutomationTrigger,
} from './automation.schemas.js'

type Timestamp = bigint | number

export type AutomationRuleRow = {
  id: string
  tenantId: string
  projectId: string | null
  name: string
  enabled: boolean
  trigger: string
  conditions: unknown
  actions: unknown
  webhookSecret: unknown
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AutomationEventRow = {
  id: string
  tenantId: string
  type: string
  subjectType: string
  subjectId: string
  payload: unknown
  causationDepth: number
  attempts: number
  claimedAt: Timestamp | null
  processedAt: Timestamp | null
  nextAttemptAt: Timestamp | null
  createdAt: Timestamp
}

export type AutomationRunRow = {
  id: string
  tenantId: string
  ruleId: string
  eventId: string
  status: string
  errorCode: string | null
  attempt: number
  responseCode: number | null
  startedAt: Timestamp
  finishedAt: Timestamp
  durationMs: number
  createdAt: Timestamp
}

export type NotificationRow = {
  id: string
  tenantId: string
  userId: string
  kind: string
  title: string
  subjectType: string | null
  subjectId: string | null
  readAt: Timestamp | null
  createdAt: Timestamp
}

export type SerializedAutomationRule = {
  object: 'projects.automation-rule'
  id: string
  projectId: string | null
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  conditions: Array<{
    fieldKey: string
    op: string
    value?: string | string[]
  }>
  actions: AutomationAction[]
  hasWebhookSecret: boolean
  createdAt: number
  updatedAt: number
}

export type SerializedAutomationRun = {
  object: 'projects.automation-run'
  id: string
  ruleId: string
  eventId: string
  status: 'succeeded' | 'failed' | 'skipped'
  errorCode: string | null
  attempt: number
  responseCode: number | null
  startedAt: number
  finishedAt: number
  durationMs: number
}

export type SerializedNotification = {
  object: 'projects.notification'
  id: string
  userId: string
  kind: string
  title: string
  subjectType: string | null
  subjectId: string | null
  readAt: number | null
  createdAt: number
}

function parseConditions(value: unknown) {
  if (!Array.isArray(value)) return []
  return value as SerializedAutomationRule['conditions']
}

function parseActions(value: unknown): AutomationAction[] {
  if (!Array.isArray(value)) return []
  return value as AutomationAction[]
}

export function serializeAutomationRule(
  row: AutomationRuleRow
): SerializedAutomationRule {
  return {
    object: 'projects.automation-rule',
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    enabled: row.enabled,
    trigger: row.trigger as AutomationTrigger,
    conditions: parseConditions(row.conditions),
    actions: parseActions(row.actions),
    hasWebhookSecret: row.webhookSecret !== null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  }
}

export function serializeAutomationRun(
  row: AutomationRunRow
): SerializedAutomationRun {
  return {
    object: 'projects.automation-run',
    id: row.id,
    ruleId: row.ruleId,
    eventId: row.eventId,
    status: row.status as SerializedAutomationRun['status'],
    errorCode: row.errorCode,
    attempt: row.attempt,
    responseCode: row.responseCode,
    startedAt: Number(row.startedAt),
    finishedAt: Number(row.finishedAt),
    durationMs: row.durationMs,
  }
}

export function serializeNotification(
  row: NotificationRow
): SerializedNotification {
  return {
    object: 'projects.notification',
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    title: row.title,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    readAt: row.readAt === null ? null : Number(row.readAt),
    createdAt: Number(row.createdAt),
  }
}

export function readRuleSecret(row: { webhookSecret: unknown }): SealedValue | null {
  return parseSealedSecret(row.webhookSecret)
}

export function parseSealedSecret(value: unknown): SealedValue | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (
    typeof record.ciphertext !== 'string' ||
    (record.keyId !== null && typeof record.keyId !== 'string') ||
    typeof record.provider !== 'string'
  )
    return null
  return {
    ciphertext: record.ciphertext,
    keyId: record.keyId as string | null,
    provider: record.provider,
  }
}
