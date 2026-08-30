import { getError, isError } from '@876/core'
import type {
  CreateWorkRecurrenceRuleInput,
  UpdateWorkRecurrenceRuleInput,
  WorkRecurrenceRule,
} from '@876/work'

import * as tenants from '../tenants/index.js'
import * as repository from './recurrence-rules.repository.js'

type Row = Awaited<ReturnType<typeof repository.list>>[number]
function stamp(value: Date | null) {
  return value ? Math.floor(value.getTime() / 1000) : null
}
function untilToken(value: number) {
  const date = new Date(value * 1000)
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}
function buildRRule(input: {
  frequency: string
  interval?: number
  byDay?: readonly string[]
  byMonthDay?: readonly number[]
  byMonth?: readonly number[]
  count?: number | null
  untilAt?: number | null
  weekStart?: string | null
}) {
  const parts = [`FREQ=${input.frequency}`]
  if ((input.interval ?? 1) !== 1) parts.push(`INTERVAL=${input.interval}`)
  if (input.byDay?.length) parts.push(`BYDAY=${input.byDay.join(',')}`)
  if (input.byMonthDay?.length) parts.push(`BYMONTHDAY=${input.byMonthDay.join(',')}`)
  if (input.byMonth?.length) parts.push(`BYMONTH=${input.byMonth.join(',')}`)
  if (input.count != null) parts.push(`COUNT=${input.count}`)
  if (input.untilAt != null) parts.push(`UNTIL=${untilToken(input.untilAt)}`)
  if (input.weekStart) parts.push(`WKST=${input.weekStart}`)
  return parts.join(';')
}
function serialize(row: Row, organizationId: string): WorkRecurrenceRule {
  return {
    object: 'recurrence_rule',
    id: row.id,
    organizationId,
    frequency: row.frequency,
    interval: row.interval,
    byDay: row.byDay as WorkRecurrenceRule['byDay'],
    byMonthDay: row.byMonthDay,
    byMonth: row.byMonth,
    count: row.count,
    untilAt: stamp(row.untilAt),
    timeZone: row.timeZone,
    weekStart: row.weekStart as WorkRecurrenceRule['weekStart'],
    rrule: row.rrule,
    createdBy: row.createdBy,
    createdAt: stamp(row.createdAt)!,
    updatedAt: stamp(row.updatedAt)!,
  }
}
async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}
export async function list(organizationId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  return { data: (await repository.list(tenant.id)).map((row) => serialize(row, organizationId)), hasMore: false }
}
export async function retrieve(organizationId: string, ruleId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.retrieve(tenant.id, ruleId)
  return row ? serialize(row, organizationId) : null
}
export async function create(organizationId: string, input: CreateWorkRecurrenceRuleInput) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const normalized = {
    frequency: input.frequency,
    interval: input.interval ?? 1,
    byDay: input.byDay ?? [],
    byMonthDay: input.byMonthDay ?? [],
    byMonth: input.byMonth ?? [],
    count: input.count ?? null,
    untilAt: input.untilAt ?? null,
    weekStart: input.weekStart ?? null,
  }
  const row = await repository.create({
    tenantId: tenant.id,
    ...normalized,
    untilAt: normalized.untilAt == null ? null : new Date(normalized.untilAt * 1000),
    timeZone: input.timeZone,
    rrule: buildRRule(normalized),
    createdBy: input.createdBy,
  })
  return serialize(row, organizationId)
}
export async function update(organizationId: string, ruleId: string, input: UpdateWorkRecurrenceRuleInput) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, ruleId)
  if (!current) return null
  const next = {
    frequency: input.frequency ?? current.frequency,
    interval: input.interval ?? current.interval,
    byDay: input.byDay ?? (current.byDay as never),
    byMonthDay: input.byMonthDay ?? current.byMonthDay,
    byMonth: input.byMonth ?? current.byMonth,
    count: input.count === undefined ? current.count : input.count,
    untilAt: input.untilAt === undefined ? stamp(current.untilAt) : input.untilAt,
    weekStart: input.weekStart === undefined ? current.weekStart : input.weekStart,
  }
  const row = await repository.update(ruleId, {
    ...(input.frequency === undefined ? {} : { frequency: input.frequency }),
    ...(input.interval === undefined ? {} : { interval: input.interval }),
    ...(input.byDay === undefined ? {} : { byDay: input.byDay }),
    ...(input.byMonthDay === undefined ? {} : { byMonthDay: input.byMonthDay }),
    ...(input.byMonth === undefined ? {} : { byMonth: input.byMonth }),
    ...(input.count === undefined ? {} : { count: input.count }),
    ...(input.untilAt === undefined ? {} : { untilAt: input.untilAt == null ? null : new Date(input.untilAt * 1000) }),
    ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
    ...(input.weekStart === undefined ? {} : { weekStart: input.weekStart }),
    rrule: buildRRule(next),
  })
  return serialize(row, organizationId)
}
export async function remove(organizationId: string, ruleId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, ruleId)
  if (!current) return null
  return repository.remove(ruleId)
}
