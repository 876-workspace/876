import { getError, isError, type Error as AppErrorValue } from '@876/core'
import type {
  WorkContext,
  WorkEventResource,
  WorkReminder,
  WorkResourceWork,
  WorkTask,
} from '@876/work'

import * as events from '../events/index.js'
import * as reminders from '../reminders/index.js'
import * as tasks from '../tasks/index.js'

const MAX_RESOURCE_WORK_PAGES = 100

async function collectTasks(
  organizationId: string,
  context: WorkContext
): Promise<WorkTask[] | AppErrorValue> {
  const output: WorkTask[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < MAX_RESOURCE_WORK_PAGES; page += 1) {
    const result = await tasks.list(organizationId, {
      context,
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (isError(result)) return result
    output.push(...result.data)
    if (!result.hasMore || !result.data.length) return output
    startingAfter = result.data.at(-1)!.id
  }
  return getError('work/invalid-request')
}

async function collectReminders(
  organizationId: string,
  context: WorkContext
): Promise<WorkReminder[] | AppErrorValue> {
  const output: WorkReminder[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < MAX_RESOURCE_WORK_PAGES; page += 1) {
    const result = await reminders.list(organizationId, {
      context,
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (isError(result)) return result
    output.push(...result.data)
    if (!result.hasMore || !result.data.length) return output
    startingAfter = result.data.at(-1)!.id
  }
  return getError('work/invalid-request')
}

async function collectEvents(
  organizationId: string,
  context: WorkContext,
  from: number,
  to: number
): Promise<WorkEventResource[] | AppErrorValue> {
  const output: WorkEventResource[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < MAX_RESOURCE_WORK_PAGES; page += 1) {
    const result = await events.list(organizationId, {
      context,
      from,
      to,
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (isError(result)) return result
    output.push(...result.data)
    if (!result.hasMore || !result.data.length) {
      return output.sort((left, right) => {
        const leftTime =
          left.startAt ?? Date.parse(`${left.startDate}T00:00:00Z`) / 1000
        const rightTime =
          right.startAt ?? Date.parse(`${right.startDate}T00:00:00Z`) / 1000
        return leftTime - rightTime || left.id.localeCompare(right.id)
      })
    }
    startingAfter = result.data.at(-1)!.id
  }
  return getError('work/invalid-request')
}

function taskTouchesRange(task: WorkTask, from: number, to: number) {
  const values = [task.startAt, task.dueAt].filter(
    (value): value is number => value !== null
  )
  return values.some((value) => value >= from && value < to)
}

export async function retrieve(
  organizationId: string,
  context: WorkContext,
  from: number,
  to: number
): Promise<WorkResourceWork | AppErrorValue> {
  const [taskResult, reminderResult, eventResult] = await Promise.all([
    collectTasks(organizationId, context),
    collectReminders(organizationId, context),
    collectEvents(organizationId, context, from, to),
  ])
  if (isError(taskResult)) return taskResult
  if (isError(reminderResult)) return reminderResult
  if (isError(eventResult)) return eventResult

  return {
    object: 'resource_work',
    organizationId,
    context: {
      service: context.service,
      resource: context.resource,
      externalId: context.id,
    },
    from,
    to,
    tasks: taskResult.filter((task) => taskTouchesRange(task, from, to)),
    reminders: reminderResult.filter(
      (reminder) =>
        reminder.status === 'SCHEDULED' &&
        reminder.remindAt !== null &&
        reminder.remindAt >= from &&
        reminder.remindAt < to
    ),
    events: eventResult,
    overdueTasks: taskResult.filter(
      (task) =>
        task.dueAt !== null &&
        task.dueAt < from &&
        !['DONE', 'CANCELLED'].includes(task.status)
    ),
  }
}
