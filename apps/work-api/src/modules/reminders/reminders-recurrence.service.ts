import { getError, isError } from '@876/core'
import type { CreateWorkRecurrenceRuleInput } from '@876/work'

import * as recurrenceRules from '../recurrence-rules/index.js'
import * as reminders from './reminders.service.js'

export async function retrieve(organizationId: string, reminderId: string) {
  const reminder = await reminders.retrieve(organizationId, reminderId)
  if (!reminder || isError(reminder)) return reminder
  if (!reminder.recurrenceRuleId) return null

  const rule = await recurrenceRules.retrieve(
    organizationId,
    reminder.recurrenceRuleId
  )
  if (isError(rule)) return rule
  return rule ?? getError('work/recurrence-rule-not-found')
}

export async function set(
  organizationId: string,
  reminderId: string,
  input: CreateWorkRecurrenceRuleInput
) {
  const reminder = await reminders.retrieve(organizationId, reminderId)
  if (!reminder || isError(reminder)) return reminder

  const previousRuleId = reminder.recurrenceRuleId
  const rule = await recurrenceRules.prepareForResource(
    organizationId,
    previousRuleId,
    input
  )
  if (!rule || isError(rule)) return rule

  if (rule.id !== previousRuleId) {
    const updated = await reminders.update(organizationId, reminderId, {
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

export async function clear(organizationId: string, reminderId: string) {
  const reminder = await reminders.retrieve(organizationId, reminderId)
  if (!reminder || isError(reminder)) return reminder
  if (!reminder.recurrenceRuleId) return reminder

  const previousRuleId = reminder.recurrenceRuleId
  const updated = await reminders.update(organizationId, reminderId, {
    recurrenceRuleId: null,
  })
  if (!updated || isError(updated)) return updated

  await recurrenceRules.cleanupDetached(organizationId, previousRuleId)
  return updated
}
