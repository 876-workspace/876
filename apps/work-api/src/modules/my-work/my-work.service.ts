import { isError } from '@876/core'
import type {
  WorkEventResource,
  WorkMyWork,
  WorkReminder,
  WorkTask,
} from '@876/work'

import * as calendars from '../calendars/index.js'
import * as events from '../events/index.js'
import * as reminders from '../reminders/index.js'
import * as tasks from '../tasks/index.js'

async function collectTasks(organizationId: string, userId: string) {
  const output: WorkTask[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < 100; page += 1) {
    const result = await tasks.list(organizationId, {
      assigneeId: userId,
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (isError(result)) return result
    output.push(...result.data)
    if (!result.hasMore || !result.data.length) return output
    startingAfter = result.data.at(-1)!.id
  }
  return output
}

async function collectReminders(organizationId: string, userId: string) {
  const output: WorkReminder[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < 100; page += 1) {
    const result = await reminders.list(organizationId, {
      userId,
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (isError(result)) return result
    output.push(...result.data)
    if (!result.hasMore || !result.data.length) return output
    startingAfter = result.data.at(-1)!.id
  }
  return output
}

async function collectEvents(
  organizationId: string,
  userId: string,
  from: number,
  to: number
) {
  const calendarResult = await calendars.list(organizationId, {
    userId,
    limit: 100,
  })
  if (isError(calendarResult)) return calendarResult

  const output: WorkEventResource[] = []
  for (const calendar of calendarResult.data) {
    let startingAfter: string | undefined
    for (let page = 0; page < 100; page += 1) {
      const result = await events.list(organizationId, {
        calendarId: calendar.id,
        from,
        to,
        limit: 100,
        ...(startingAfter ? { startingAfter } : {}),
      })
      if (isError(result)) return result
      output.push(...(result.data as WorkEventResource[]))
      if (!result.hasMore || !result.data.length) break
      startingAfter = result.data.at(-1)!.id
    }
  }
  return output.sort((left, right) => {
    const leftTime =
      left.startAt ?? Date.parse(`${left.startDate}T00:00:00Z`) / 1000
    const rightTime =
      right.startAt ?? Date.parse(`${right.startDate}T00:00:00Z`) / 1000
    return leftTime - rightTime || left.id.localeCompare(right.id)
  })
}

function taskTouchesRange(task: WorkTask, from: number, to: number) {
  const values = [task.startAt, task.dueAt].filter(
    (value): value is number => value !== null
  )
  return values.some((value) => value >= from && value < to)
}

export async function retrieve(
  organizationId: string,
  userId: string,
  from: number,
  to: number
): Promise<WorkMyWork | ReturnType<typeof tasks.list>> {
  const taskResult = await collectTasks(organizationId, userId)
  if (isError(taskResult)) return taskResult as never
  const reminderResult = await collectReminders(organizationId, userId)
  if (isError(reminderResult)) return reminderResult as never
  const eventResult = await collectEvents(organizationId, userId, from, to)
  if (isError(eventResult)) return eventResult as never

  return {
    object: 'my_work',
    organizationId,
    userId,
    from,
    to,
    tasks: taskResult.filter((task) => taskTouchesRange(task, from, to)),
    reminders: reminderResult.filter(
      (reminder) =>
        reminder.status === 'SCHEDULED' &&
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
