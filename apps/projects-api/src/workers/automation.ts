import { generateId } from '../platform/ids.js'
import {
  unsealWebhookSecret,
} from '../platform/secure-field.js'
import {
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../platform/timestamps.js'
import * as calendar from '../modules/calendar/index.js'
import * as issues from '../modules/issues/index.js'
import * as labels from '../modules/labels/index.js'
import {
  computeRetryDelaySeconds,
  MAX_EVENT_ATTEMPTS,
  recordEventAttempt,
  markEventProcessed,
  claimEvents,
  findRun,
  listRules,
  recordRun,
} from '../modules/automation/automation.repository.js'
import {
  readRuleSecret,
  type AutomationEventRow,
  type AutomationRuleRow,
} from '../modules/automation/automation.serializers.js'
import type { AutomationAction } from '../modules/automation/automation.schemas.js'
import {
  buildSubjectSnapshot,
  type SubjectSnapshot,
} from '../modules/automation/automation.subjects.js'
import {
  createNotificationRecord,
  sweepAutomationEvents,
} from '../modules/automation/automation.service.js'
import {
  postWebhook,
} from '../modules/automation/webhook.js'
import {
  matchesConditions,
  type LayoutCondition,
} from '../../../../packages/projects/src/layout-rules.js'

export const AUTOMATION_MAX_DEPTH = 3

export type AutomationActionContext = {
  organizationId: string
  tenantId: string
  ruleId: string
  causationDepth: number
}

export type ActionOutcome =
  | { ok: true; responseCode?: number }
  | { ok: false; errorCode: string }

function actorFor(ruleId: string): string {
  return `automation:${ruleId}`
}

function ruleConditions(row: AutomationRuleRow): LayoutCondition[] {
  return Array.isArray(row.conditions)
    ? (row.conditions as LayoutCondition[])
    : []
}

function ruleActions(row: AutomationRuleRow): AutomationAction[] {
  return Array.isArray(row.actions)
    ? (row.actions as AutomationAction[])
    : []
}

function issueMutationContext(ctx: AutomationActionContext) {
  return {
    automationRuleId: ctx.ruleId,
    causationDepth: ctx.causationDepth,
    permissions: [] as string[],
  }
}

function coerceOptionalNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return value as null | undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
    return Number(value)
  return undefined
}

async function executeSetField(
  fieldKey: string,
  value: unknown,
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  if (subject.subjectType === 'custom-record') {
    const modules = await import('../modules/custom-modules/index.js')
    if (fieldKey !== 'title' && fieldKey !== 'status' && !fieldKey.startsWith('cf:'))
      return { ok: false, errorCode: 'automation/unknown-field' }
    const patch: {
      title?: string | null
      statusKey?: string
      fields?: Array<{ key: string; value: string | number | boolean | string[] | null }>
    } =
      fieldKey === 'title'
        ? typeof value === 'string' || value === null
          ? { title: value }
          : {}
        : fieldKey === 'status'
          ? typeof value === 'string'
            ? { statusKey: value }
            : {}
          : {
              fields: [
                {
                  key: fieldKey.slice('cf:'.length),
                  value: value as string | number | boolean | string[] | null,
                },
              ],
            }
    if (Object.keys(patch).length === 0)
      return { ok: false, errorCode: 'automation/invalid-value' }
    const result = await modules.updateRecordFromAutomation(
      ctx.organizationId,
      subject.subjectId,
      patch,
      { automationRuleId: ctx.ruleId, causationDepth: ctx.causationDepth }
    )
    return result.error
      ? { ok: false, errorCode: result.error.code }
      : { ok: true }
  }
  if (subject.subjectType !== 'work-item')
    return { ok: false, errorCode: 'automation/subject-mismatch' }
  const mutation = issueMutationContext(ctx)
  switch (fieldKey) {
    case 'title':
    case 'description':
    case 'priority':
      if (typeof value !== 'string' && value !== null)
        return { ok: false, errorCode: 'automation/invalid-value' }
      break
    case 'state':
    case 'assignee':
    case 'phase':
    case 'taskList':
      if (typeof value !== 'string' && value !== null)
        return { ok: false, errorCode: 'automation/invalid-value' }
      break
    case 'dueDate':
    case 'startDate':
    case 'estimate': {
      const coerced = coerceOptionalNumber(value)
      if (coerced === undefined)
        return { ok: false, errorCode: 'automation/invalid-value' }
      const patch =
        fieldKey === 'dueDate'
          ? { dueDate: coerced }
          : fieldKey === 'startDate'
            ? { plannedStartDate: coerced }
            : { estimate: coerced }
      const result = await issues.update(
        ctx.organizationId,
        subject.subjectId,
        patch,
        mutation
      )
      return result.error
        ? { ok: false, errorCode: result.error.code }
        : { ok: true }
    }
    case 'labels':
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
        return { ok: false, errorCode: 'automation/invalid-value' }
      break
    default:
      if (fieldKey.startsWith('cf:'))
        return { ok: false, errorCode: 'automation/custom-field-unsupported' }
      return { ok: false, errorCode: 'automation/unknown-field' }
  }
  const patch: Record<string, unknown> =
    fieldKey === 'title'
      ? { title: value }
      : fieldKey === 'description'
        ? { description: value }
        : fieldKey === 'state'
          ? { status: value }
          : fieldKey === 'priority'
            ? { priority: value }
            : fieldKey === 'assignee'
              ? { assigneeUserId: value }
              : fieldKey === 'labels'
                ? { labelIds: value }
                : fieldKey === 'phase'
                  ? { milestoneId: value }
                  : { taskListId: value }
  const result = await issues.update(
    ctx.organizationId,
    subject.subjectId,
    patch as Parameters<typeof issues.update>[2],
    mutation
  )
  return result.error
    ? { ok: false, errorCode: result.error.code }
    : { ok: true }
}

async function resolveLabelId(
  organizationId: string,
  labelRef: string
): Promise<string | null> {
  const listed = await labels.list(organizationId)
  if (listed.error || !listed.data) return null
  const found = listed.data.find(
    (label) =>
      label.id === labelRef ||
      label.name.toLowerCase() === labelRef.toLowerCase()
  )
  return found?.id ?? null
}

async function executeToggleLabel(
  mode: 'add' | 'remove',
  labelRef: string,
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  if (subject.subjectType !== 'work-item')
    return { ok: false, errorCode: 'automation/subject-mismatch' }
  const current = await issues.retrieve(ctx.organizationId, subject.subjectId)
  if (current.error || !current.data)
    return {
      ok: false,
      errorCode: current.error?.code ?? 'projects/issue-not-found',
    }
  const currentIds = current.data.labels.map((label) => label.id)
  const labelId = currentIds.includes(labelRef)
    ? labelRef
    : await resolveLabelId(ctx.organizationId, labelRef)
  if (!labelId) return { ok: false, errorCode: 'automation/label-not-found' }
  const next =
    mode === 'add'
      ? [...new Set([...currentIds, labelId])]
      : currentIds.filter((id) => id !== labelId)
  const updated = await issues.update(
    ctx.organizationId,
    subject.subjectId,
    { labelIds: next },
    issueMutationContext(ctx)
  )
  return updated.error
    ? { ok: false, errorCode: updated.error.code }
    : { ok: true }
}

async function executeCreateReminder(
  action: { remindAt?: number | null; offsetMinutesBeforeDue?: number | null },
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  const timing =
    action.remindAt ?? action.offsetMinutesBeforeDue
      ? {
          ...(action.remindAt !== undefined && action.remindAt !== null
            ? { remindAt: action.remindAt }
            : {}),
          ...(action.offsetMinutesBeforeDue !== undefined &&
          action.offsetMinutesBeforeDue !== null
            ? { offsetMinutesBeforeDue: action.offsetMinutesBeforeDue }
            : {}),
        }
      : subject.values.dueDate
        ? { offsetMinutesBeforeDue: 1440 }
        : null
  if (!timing) return { ok: false, errorCode: 'automation/reminder-timing-missing' }
  const target =
    subject.subjectType === 'work-item'
      ? { issueId: subject.subjectId }
      : subject.subjectType === 'phase'
        ? { milestoneId: subject.subjectId }
        : null
  if (!target) return { ok: false, errorCode: 'automation/subject-mismatch' }
  const created = await calendar.createReminder(ctx.organizationId, {
    ...target,
    ...timing,
    createdBy: actorFor(ctx.ruleId),
  })
  return created.error
    ? { ok: false, errorCode: created.error.code }
    : { ok: true }
}

async function executeCreateEvent(
  action: {
    title: string
    description?: string | null
    startsAt: number
    endsAt?: number | null
  },
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  if (!subject.projectId)
    return { ok: false, errorCode: 'automation/project-missing' }
  const created = await calendar.createEvent(ctx.organizationId, {
    projectId: subject.projectId,
    ...(subject.subjectType === 'work-item'
      ? { issueId: subject.subjectId }
      : {}),
    ...(subject.subjectType === 'phase'
      ? { milestoneId: subject.subjectId }
      : {}),
    title: action.title,
    description: action.description ?? null,
    startsAt: action.startsAt,
    endsAt: action.endsAt ?? null,
  })
  return created.error
    ? { ok: false, errorCode: created.error.code }
    : { ok: true }
}

async function executeWebhook(
  url: string,
  rule: AutomationRuleRow,
  event: AutomationEventRow,
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  const sealed = readRuleSecret(rule)
  if (!sealed) return { ok: false, errorCode: 'automation/webhook-secret-missing' }
  let secret: string
  try {
    secret = await unsealWebhookSecret(ctx.tenantId, rule.id, sealed)
  } catch {
    return { ok: false, errorCode: 'automation/webhook-secret-unsealable' }
  }
  let delivery: { status: number }
  try {
    delivery = await postWebhook(url, secret, {
      ruleId: rule.id,
      eventId: event.id,
      trigger: event.type,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      projectId: subject.projectId,
      values: subject.values,
    })
  } catch {
    return { ok: false, errorCode: 'automation/webhook-failed' }
  }
  if (delivery.status < 200 || delivery.status >= 300)
    return { ok: false, errorCode: 'automation/webhook-failed' }
  return { ok: true, responseCode: delivery.status }
}

async function executeCreateSubItem(
  action: { title: string; typeKey?: string; assigneeUserId?: string | null },
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  if (subject.subjectType !== 'work-item' || !subject.projectId)
    return { ok: false, errorCode: 'automation/subject-mismatch' }
  const created = await issues.create(
    ctx.organizationId,
    {
      projectId: subject.projectId,
      title: action.title,
      parentIssueId: subject.subjectId,
      ...(action.typeKey ? { typeKey: action.typeKey } : {}),
      ...(action.assigneeUserId !== undefined
        ? { assigneeUserId: action.assigneeUserId }
        : {}),
    },
    issueMutationContext(ctx)
  )
  return created.error
    ? { ok: false, errorCode: created.error.code }
    : { ok: true }
}

export async function executeAutomationAction(
  action: AutomationAction,
  rule: AutomationRuleRow,
  event: AutomationEventRow,
  subject: SubjectSnapshot,
  ctx: AutomationActionContext
): Promise<ActionOutcome> {
  switch (action.type) {
    case 'set-field':
      return executeSetField(action.fieldKey, action.value, subject, ctx)
    case 'assign': {
      if (subject.subjectType !== 'work-item')
        return { ok: false, errorCode: 'automation/subject-mismatch' }
      const updated = await issues.update(
        ctx.organizationId,
        subject.subjectId,
        { assigneeUserId: action.userId },
        issueMutationContext(ctx)
      )
      return updated.error
        ? { ok: false, errorCode: updated.error.code }
        : { ok: true }
    }
    case 'add-label':
      return executeToggleLabel('add', action.label, subject, ctx)
    case 'remove-label':
      return executeToggleLabel('remove', action.label, subject, ctx)
    case 'create-reminder':
      return executeCreateReminder(action, subject, ctx)
    case 'create-event':
      return executeCreateEvent(action, subject, ctx)
    case 'notify': {
      await createNotificationRecord(ctx.tenantId, {
        userId: action.userId,
        kind: action.kind ?? 'automation',
        title: action.title,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
      })
      return { ok: true }
    }
    case 'call-webhook':
      return executeWebhook(action.url, rule, event, subject, ctx)
    case 'create-sub-item':
      return executeCreateSubItem(action, subject, ctx)
  }
}

function readPayloadOrganizationId(event: AutomationEventRow): string | null {
  if (typeof event.payload !== 'object' || event.payload === null) return null
  const value = (event.payload as Record<string, unknown>).organizationId
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readPayloadProjectId(event: AutomationEventRow): string | undefined {
  if (typeof event.payload !== 'object' || event.payload === null)
    return undefined
  const value = (event.payload as Record<string, unknown>).projectId
  return typeof value === 'string' ? value : undefined
}

async function writeRun(params: {
  tenantId: string
  ruleId: string
  eventId: string
  status: 'succeeded' | 'failed' | 'skipped'
  errorCode: string | null
  attempt: number
  responseCode?: number | null
  startedAtMs: number
}): Promise<void> {
  const finishedAtMs = Date.now()
  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  await recordRun({
    id: generateId('automationRun'),
    tenantId: params.tenantId,
    ruleId: params.ruleId,
    eventId: params.eventId,
    status: params.status,
    errorCode: params.errorCode,
    attempt: params.attempt,
    responseCode: params.responseCode ?? null,
    startedAt: toDbUnixSeconds(Math.floor(params.startedAtMs / 1000)),
    finishedAt: toDbUnixSeconds(Math.floor(finishedAtMs / 1000)),
    durationMs: Math.max(0, finishedAtMs - params.startedAtMs),
    createdAt: timestamp,
  })
}

export type ProcessedEventCounts = {
  succeeded: number
  failed: number
  skipped: number
}

export async function processAutomationEvent(
  event: AutomationEventRow
): Promise<ProcessedEventCounts> {
  const counts: ProcessedEventCounts = { succeeded: 0, failed: 0, skipped: 0 }
  const attempt = event.attempts + 1
  const rules = (await listRules(event.tenantId)).filter(
    (rule) => rule.enabled && rule.trigger === event.type
  )
  if (rules.length === 0) {
    await markEventProcessed(event.id, toDbUnixSeconds(nowUnixSeconds()))
    return counts
  }

  if (event.causationDepth > AUTOMATION_MAX_DEPTH) {
    for (const rule of rules)
      await writeRun({
        tenantId: event.tenantId,
        ruleId: rule.id,
        eventId: event.id,
        status: 'skipped',
        errorCode: 'automation/max-depth-exceeded',
        attempt,
        startedAtMs: Date.now(),
      })
    counts.skipped += rules.length
    await markEventProcessed(event.id, toDbUnixSeconds(nowUnixSeconds()))
    return counts
  }

  const organizationId = readPayloadOrganizationId(event)
  if (!organizationId) {
    for (const rule of rules)
      await writeRun({
        tenantId: event.tenantId,
        ruleId: rule.id,
        eventId: event.id,
        status: 'failed',
        errorCode: 'automation/organization-missing',
        attempt,
        startedAtMs: Date.now(),
      })
    counts.failed += rules.length
    await markEventProcessed(event.id, toDbUnixSeconds(nowUnixSeconds()))
    return counts
  }

  const snapshot = await buildSubjectSnapshot(
    organizationId,
    event.subjectType as SubjectSnapshot['subjectType'],
    event.subjectId,
    readPayloadProjectId(event)
  )
  if (snapshot.error || !snapshot.snapshot) {
    const code =
      snapshot.error && snapshot.error.code === 'projects/invalid-request'
        ? snapshot.error.code
        : 'projects/automation-subject-not-found'
    for (const rule of rules)
      await writeRun({
        tenantId: event.tenantId,
        ruleId: rule.id,
        eventId: event.id,
        status: 'failed',
        errorCode: code,
        attempt,
        startedAtMs: Date.now(),
      })
    counts.failed += rules.length
    await markEventProcessed(event.id, toDbUnixSeconds(nowUnixSeconds()))
    return counts
  }
  const subject = snapshot.snapshot

  let eventFailed = false
  for (const rule of rules) {
    if (
      rule.projectId !== null &&
      subject.projectId !== null &&
      rule.projectId !== subject.projectId
    )
      continue
    const existing = await findRun(rule.id, event.id)
    if (existing?.status === 'succeeded') {
      counts.skipped += 1
      continue
    }
    const conditions = ruleConditions(rule)
    if (!matchesConditions(conditions, subject.values)) {
      await writeRun({
        tenantId: event.tenantId,
        ruleId: rule.id,
        eventId: event.id,
        status: 'skipped',
        errorCode: null,
        attempt,
        startedAtMs: Date.now(),
      })
      counts.skipped += 1
      continue
    }
    const startedAtMs = Date.now()
    const ctx: AutomationActionContext = {
      organizationId,
      tenantId: event.tenantId,
      ruleId: rule.id,
      causationDepth: event.causationDepth + 1,
    }
    let failure: string | null = null
    let responseCode: number | null = null
    try {
      for (const action of ruleActions(rule)) {
        const outcome = await executeAutomationAction(
          action,
          rule,
          event,
          subject,
          ctx
        )
        if (!outcome.ok) {
          failure = outcome.errorCode
          break
        }
        if (outcome.responseCode !== undefined)
          responseCode = outcome.responseCode
      }
    } catch {
      failure = 'automation/action-failed'
    }
    if (failure) {
      eventFailed = true
      await writeRun({
        tenantId: event.tenantId,
        ruleId: rule.id,
        eventId: event.id,
        status: 'failed',
        errorCode: failure,
        attempt,
        startedAtMs,
      })
      counts.failed += 1
    } else {
      await writeRun({
        tenantId: event.tenantId,
        ruleId: rule.id,
        eventId: event.id,
        status: 'succeeded',
        errorCode: null,
        attempt,
        responseCode,
        startedAtMs,
      })
      counts.succeeded += 1
    }
  }

  const finishedAt = toDbUnixSeconds(nowUnixSeconds())
  if (eventFailed) {
    const attempts = event.attempts + 1
    if (attempts >= MAX_EVENT_ATTEMPTS) {
      await markEventProcessed(event.id, finishedAt)
    } else {
      await recordEventAttempt(
        event.id,
        attempts,
        finishedAt + BigInt(computeRetryDelaySeconds(attempts))
      )
    }
  } else {
    await markEventProcessed(event.id, finishedAt)
  }
  return counts
}

export type DrainResult = ProcessedEventCounts & {
  claimed: number
  processedEvents: number
  swept: { tenants: number; dueApproaching: number; budgetThreshold: number }
}

export async function drainAutomation(
  limit = 50,
  nowSeconds: number = nowUnixSeconds()
): Promise<DrainResult> {
  const swept = await sweepAutomationEvents(nowSeconds)
  const claimed = await claimEvents(limit, toDbUnixSeconds(nowSeconds))
  const totals: DrainResult = {
    claimed: claimed.length,
    processedEvents: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    swept,
  }
  for (const event of claimed) {
    const counts = await processAutomationEvent({
      ...event,
      causationDepth: Number(event.causationDepth),
      attempts: Number(event.attempts),
    })
    totals.processedEvents += 1
    totals.succeeded += counts.succeeded
    totals.failed += counts.failed
    totals.skipped += counts.skipped
  }
  return totals
}
