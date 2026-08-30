import type { WorkRecurrenceRule } from '@876/work'
import * as alerts from '../alerts/index.js'
import * as reminders from '../reminders/index.js'
import * as recurrence from '../recurrence-rules/index.js'
import { occurrencesBetween } from '../../lib/recurrence.js'
import {
  HttpNotificationGateway,
  type NotificationGateway,
} from '../../providers/notifications.js'
import * as repository from './notification-outbox.repository.js'
const key = (date: Date) => date.toISOString()
async function reminderOccurrences(
  reminder: Awaited<ReturnType<typeof reminders.due>>[number],
  now: Date
) {
  if (!reminder.recurrenceRuleId)
    return reminder.remindAt <= now ? [reminder.remindAt] : []
  const tenantOrg = await import('../../db/index.js').then(
    async ({ prisma }) =>
      (await prisma.workTenant.findUnique({ where: { id: reminder.tenantId } }))
        ?.organizationId
  )
  if (!tenantOrg) return []
  const rule = await recurrence.retrieve(tenantOrg, reminder.recurrenceRuleId)
  if (!rule || 'httpStatus' in rule) return []
  const after = new Date(now.getTime() - 25 * 60 * 60 * 1000)
  return occurrencesBetween(
    rule as WorkRecurrenceRule,
    reminder.remindAt,
    after,
    now
  )
}
export async function materialize(now = new Date()) {
  let created = 0
  const dueReminders = await reminders.due(now, 500)
  for (const reminder of dueReminders) {
    const occurrences = await reminderOccurrences(reminder, now)
    for (const occurrence of occurrences) {
      await repository.enqueue({
        tenantId: reminder.tenantId,
        sourceType: 'REMINDER',
        sourceId: reminder.id,
        occurrenceKey: key(occurrence),
        userId: reminder.userId,
        channel: 'NOTIFICATION',
        deliverAt: occurrence,
        payload: {
          object: 'reminder_notification',
          reminderId: reminder.id,
          title: reminder.title,
          note: reminder.note,
          context: reminder.contextService
            ? {
                service: reminder.contextService,
                resource: reminder.contextResource,
                id: reminder.contextId,
              }
            : null,
        },
      })
      created += 1
    }
  }
  for (const alert of await alerts.absoluteDue(now, 500)) {
    await repository.enqueue({
      tenantId: alert.tenantId,
      sourceType: 'ALERT',
      sourceId: alert.id,
      occurrenceKey: key(alert.triggerAt!),
      userId: alert.userId,
      channel: alert.action,
      deliverAt: alert.triggerAt!,
      payload: {
        object: 'work_alert',
        alertId: alert.id,
        taskId: alert.taskId,
        eventId: alert.eventId,
        title: alert.task?.title ?? alert.event?.title ?? '876 Work',
      },
    })
    created += 1
  }
  for (const alert of await alerts.relativeCandidates(500)) {
    const base =
      alert.task?.dueAt ?? alert.event?.startAt ?? alert.event?.startDate
    if (!base || alert.offsetSeconds == null) continue
    const deliverAt = new Date(base.getTime() - alert.offsetSeconds * 1000)
    if (deliverAt > now) continue
    await repository.enqueue({
      tenantId: alert.tenantId,
      sourceType: 'ALERT',
      sourceId: alert.id,
      occurrenceKey: key(base),
      userId: alert.userId,
      channel: alert.action,
      deliverAt,
      payload: {
        object: 'work_alert',
        alertId: alert.id,
        taskId: alert.taskId,
        eventId: alert.eventId,
        title: alert.task?.title ?? alert.event?.title ?? '876 Work',
      },
    })
    created += 1
  }
  return { materialized: created }
}
export async function dispatch(
  now = new Date(),
  gateway: NotificationGateway = new HttpNotificationGateway()
) {
  let dispatched = 0,
    failed = 0
  for (const row of await repository.pending(now, 100)) {
    try {
      await gateway.dispatch({
        userId: row.userId,
        channel: row.channel,
        source: {
          type: row.sourceType,
          id: row.sourceId,
          occurrenceKey: row.occurrenceKey,
        },
        payload: row.payload,
      })
      await repository.markDispatched(row.id)
      await repository.markSourceDelivered(row.sourceType, row.sourceId)
      dispatched += 1
    } catch (error) {
      await repository.markFailed(
        row.id,
        error instanceof Error
          ? error.message
          : 'Unknown notification dispatch failure.'
      )
      failed += 1
    }
  }
  return { dispatched, failed }
}
export async function run(now = new Date(), gateway?: NotificationGateway) {
  const materialized = await materialize(now)
  const delivered = await dispatch(now, gateway)
  return {
    object: 'work_notification_run' as const,
    ...materialized,
    ...delivered,
    at: Math.floor(now.getTime() / 1000),
  }
}
