import { getError, isError } from '@876/core'
import type { CreateWorkRecurrenceRuleInput } from '@876/work'

import * as recurrenceRules from '../recurrence-rules/index.js'
import * as events from './events.service.js'

export async function retrieve(organizationId: string, eventId: string) {
  const event = await events.retrieve(organizationId, eventId)
  if (!event || isError(event)) return event
  if (!event.recurrenceRuleId) return null

  const rule = await recurrenceRules.retrieve(
    organizationId,
    event.recurrenceRuleId
  )
  if (isError(rule)) return rule
  return rule ?? getError('work/recurrence-rule-not-found')
}

export async function set(
  organizationId: string,
  eventId: string,
  input: CreateWorkRecurrenceRuleInput
) {
  const event = await events.retrieve(organizationId, eventId)
  if (!event || isError(event)) return event

  const previousRuleId = event.recurrenceRuleId
  const rule = await recurrenceRules.prepareForResource(
    organizationId,
    previousRuleId,
    input
  )
  if (!rule || isError(rule)) return rule

  if (rule.id !== previousRuleId) {
    const updated = await events.update(organizationId, eventId, {
      recurrenceRuleId: rule.id,
    })
    if (!updated || isError(updated)) {
      await recurrenceRules.cleanupDetached(organizationId, rule.id)
      return updated
    }
    if (previousRuleId)
      await recurrenceRules.cleanupDetached(organizationId, previousRuleId)
  }

  return rule
}

export async function clear(organizationId: string, eventId: string) {
  const event = await events.retrieve(organizationId, eventId)
  if (!event || isError(event)) return event
  if (!event.recurrenceRuleId) return event

  const previousRuleId = event.recurrenceRuleId
  const updated = await events.update(organizationId, eventId, {
    recurrenceRuleId: null,
  })
  if (!updated || isError(updated)) return updated

  await recurrenceRules.cleanupDetached(organizationId, previousRuleId)
  return updated
}
