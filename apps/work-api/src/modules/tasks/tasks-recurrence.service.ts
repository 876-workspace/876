import { getError, isError } from '@876/core'
import type { CreateWorkRecurrenceRuleInput } from '@876/work'

import * as recurrenceRules from '../recurrence-rules/index.js'
import * as tasks from './tasks.service.js'

export async function retrieve(organizationId: string, taskId: string) {
  const task = await tasks.retrieve(organizationId, taskId)
  if (isError(task)) return task
  if (!task) return getError('work/task-not-found')
  if (!task.recurrenceRuleId) return null

  const rule = await recurrenceRules.retrieve(
    organizationId,
    task.recurrenceRuleId
  )
  if (isError(rule)) return rule
  return rule ?? getError('work/recurrence-rule-not-found')
}

export async function set(
  organizationId: string,
  taskId: string,
  input: CreateWorkRecurrenceRuleInput
) {
  const task = await tasks.retrieve(organizationId, taskId)
  if (isError(task)) return task
  if (!task) return getError('work/task-not-found')

  const previousRuleId = task.recurrenceRuleId
  const rule = await recurrenceRules.prepareForResource(
    organizationId,
    previousRuleId,
    input
  )
  if (!rule || isError(rule)) return rule

  if (rule.id !== previousRuleId) {
    const updated = await tasks.update(organizationId, taskId, {
      recurrenceRuleId: rule.id,
    })
    if (!updated || isError(updated)) {
      await recurrenceRules.cleanupDetached(organizationId, rule.id)
      return updated ?? getError('work/task-not-found')
    }
    if (previousRuleId) {
      const cleanup = await recurrenceRules.cleanupDetached(
        organizationId,
        previousRuleId
      )
      if (isError(cleanup)) return cleanup
    }
  }

  return rule
}

export async function clear(organizationId: string, taskId: string) {
  const task = await tasks.retrieve(organizationId, taskId)
  if (isError(task)) return task
  if (!task) return getError('work/task-not-found')
  if (!task.recurrenceRuleId) return task

  const previousRuleId = task.recurrenceRuleId
  const updated = await tasks.update(organizationId, taskId, {
    recurrenceRuleId: null,
  })
  if (!updated || isError(updated))
    return updated ?? getError('work/task-not-found')

  const cleanup = await recurrenceRules.cleanupDetached(
    organizationId,
    previousRuleId
  )
  if (isError(cleanup)) return cleanup
  return updated
}
