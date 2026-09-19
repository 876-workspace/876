import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../alerts/index.js', () => ({
  absoluteDue: vi.fn(),
  relativeCandidates: vi.fn(),
  list: vi.fn(),
}))
vi.mock('../reminders/index.js', () => ({
  due: vi.fn(),
  list: vi.fn(),
}))
vi.mock('../recurrence-rules/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('../../lib/recurrence/index.js', () => ({
  occurrencesBetween: vi.fn(),
}))
vi.mock('../../db/index.js', () => ({
  prisma: {
    workTenant: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('./notification-outbox.repository.js', () => ({
  enqueue: vi.fn(),
  pending: vi.fn(),
  markDispatched: vi.fn(),
  markSourceDelivered: vi.fn(),
  markFailed: vi.fn(),
}))

import * as alerts from '../alerts/index.js'
import * as reminders from '../reminders/index.js'
import * as recurrence from '../recurrence-rules/index.js'
import { occurrencesBetween } from '../../lib/recurrence/index.js'
import { prisma } from '../../db/index.js'
import type { NotificationGateway } from '../../providers/notifications.js'
import * as repository from './notification-outbox.repository.js'
import * as service from './notification-outbox.service.js'

const NOW = new Date('2026-08-30T12:00:00.000Z')

function createReminderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reminder_kin_01',
    tenantId: 'work_tnt_kingston_01',
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'crm_req_kin_01',
    title: 'Confirm Dispatch to Montego Bay',
    note: 'Call depot supervisor',
    remindAt: new Date('2026-08-30T11:00:00.000Z'),
    timeZone: 'America/Jamaica',
    recurrenceRuleId: null,
    userId: 'usr_tariq_01',
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_tariq_01',
    createdAt: new Date('2026-08-30T09:00:00.000Z'),
    updatedAt: new Date('2026-08-30T09:00:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

function createAbsoluteAlertFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert_abs_01',
    tenantId: 'work_tnt_kingston_01',
    taskId: 'task_kin_01',
    eventId: null,
    userId: 'usr_tariq_01',
    triggerType: 'ABSOLUTE',
    triggerAt: new Date('2026-08-30T11:30:00.000Z'),
    offsetSeconds: null,
    action: 'NOTIFICATION',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    task: { title: 'Depot Generator Inspection' },
    event: null,
    ...overrides,
  }
}

function createRelativeAlertFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert_rel_01',
    tenantId: 'work_tnt_kingston_01',
    taskId: 'task_kin_02',
    eventId: null,
    userId: 'usr_tariq_01',
    triggerType: 'RELATIVE',
    triggerAt: null,
    offsetSeconds: 1800, // 30 minutes before base
    action: 'EMAIL',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    task: {
      dueAt: new Date('2026-08-30T12:15:00.000Z'), // deliverAt = 12:15 - 30m = 11:45 <= NOW
      title: 'Spanish Town Delivery Task',
    },
    event: null,
    ...overrides,
  }
}

function createPendingOutboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outbox_01',
    tenantId: 'work_tnt_kingston_01',
    sourceType: 'REMINDER',
    sourceId: 'reminder_kin_01',
    occurrenceKey: '2026-08-30T11:00:00.000Z',
    userId: 'usr_tariq_01',
    channel: 'NOTIFICATION',
    deliverAt: new Date('2026-08-30T11:00:00.000Z'),
    payload: {
      object: 'reminder_notification',
      reminderId: 'reminder_kin_01',
      title: 'Confirm Dispatch to Montego Bay',
      note: 'Call depot supervisor',
      context: { service: 'crm', resource: 'request', id: 'crm_req_kin_01' },
    },
    status: 'PENDING',
    attemptCount: 0,
    lastError: null,
    dispatchedAt: null,
    createdAt: new Date('2026-08-30T11:00:00.000Z'),
    updatedAt: new Date('2026-08-30T11:00:00.000Z'),
    ...overrides,
  }
}

describe('Work notification-outbox service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.mocked(reminders.due).mockResolvedValue([createReminderFixture()])
    vi.mocked(alerts.absoluteDue).mockResolvedValue([])
    vi.mocked(alerts.relativeCandidates).mockResolvedValue([])
    vi.mocked(repository.pending).mockResolvedValue([])
    vi.mocked(prisma.workTenant.findUnique).mockResolvedValue(null as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('materializes a non-recurring due reminder into a single outbox entry', async () => {
    const dueReminder = createReminderFixture()
    vi.mocked(reminders.due).mockResolvedValue([dueReminder])

    const result = await service.materialize(NOW)

    expect(reminders.due).toHaveBeenCalledWith(NOW, 500)
    expect(repository.enqueue).toHaveBeenCalledTimes(1)
    expect(repository.enqueue).toHaveBeenCalledWith({
      tenantId: 'work_tnt_kingston_01',
      sourceType: 'REMINDER',
      sourceId: 'reminder_kin_01',
      occurrenceKey: '2026-08-30T11:00:00.000Z',
      userId: 'usr_tariq_01',
      channel: 'NOTIFICATION',
      deliverAt: new Date('2026-08-30T11:00:00.000Z'),
      payload: {
        object: 'reminder_notification',
        reminderId: 'reminder_kin_01',
        title: 'Confirm Dispatch to Montego Bay',
        note: 'Call depot supervisor',
        context: { service: 'crm', resource: 'request', id: 'crm_req_kin_01' },
      },
    })
    expect(result).toEqual({ materialized: 1 })
  })

  it('enqueues one outbox entry per occurrence for a recurring reminder', async () => {
    const recurringReminder = createReminderFixture({
      recurrenceRuleId: 'recrule_01',
    })
    vi.mocked(reminders.due).mockResolvedValue([recurringReminder])
    vi.mocked(prisma.workTenant.findUnique).mockResolvedValue({
      id: 'work_tnt_kingston_01',
      organizationId: 'org_kingston_central',
    } as never)
    vi.mocked(recurrence.retrieve).mockResolvedValue({
      object: 'recurrence_rule',
      id: 'recrule_01',
      organizationId: 'org_kingston_central',
      frequency: 'DAILY',
      interval: 1,
      rrule: 'FREQ=DAILY',
      byDay: [],
      byMonthDay: [],
      byMonth: [],
      count: null,
      untilAt: null,
      timeZone: 'America/Jamaica',
      weekStart: 'MO',
      createdBy: 'usr_tariq_01',
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
    })
    const occ1 = new Date('2026-08-30T10:00:00.000Z')
    const occ2 = new Date('2026-08-30T11:00:00.000Z')
    vi.mocked(occurrencesBetween).mockReturnValue([occ1, occ2])

    const result = await service.materialize(NOW)

    expect(occurrencesBetween).toHaveBeenCalledTimes(1)
    expect(occurrencesBetween).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: 'DAILY' }),
      new Date('2026-08-30T11:00:00.000Z'),
      new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
      NOW
    )
    expect(repository.enqueue).toHaveBeenCalledTimes(2)
    expect(repository.enqueue).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        occurrenceKey: '2026-08-30T10:00:00.000Z',
        deliverAt: occ1,
      })
    )
    expect(repository.enqueue).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        occurrenceKey: '2026-08-30T11:00:00.000Z',
        deliverAt: occ2,
      })
    )
    expect(result).toEqual({ materialized: 2 })
  })

  it('skips non-recurring reminder if remindAt is in the future (> now)', async () => {
    const futureReminder = createReminderFixture({
      remindAt: new Date('2026-08-30T14:00:00.000Z'),
    })
    vi.mocked(reminders.due).mockResolvedValue([futureReminder])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).not.toHaveBeenCalled()
    expect(result).toEqual({ materialized: 0 })
  })

  it('skips recurring reminder when recurrence rule cannot be retrieved', async () => {
    const recurringReminder = createReminderFixture({
      recurrenceRuleId: 'recrule_missing',
    })
    vi.mocked(reminders.due).mockResolvedValue([recurringReminder])
    vi.mocked(prisma.workTenant.findUnique).mockResolvedValue({
      id: 'work_tnt_kingston_01',
      organizationId: 'org_kingston_central',
    } as never)
    vi.mocked(recurrence.retrieve).mockResolvedValue(null)

    const result = await service.materialize(NOW)

    expect(repository.enqueue).not.toHaveBeenCalled()
    expect(result).toEqual({ materialized: 0 })
  })

  it('skips recurring reminder when tenant cannot be found', async () => {
    const recurringReminder = createReminderFixture({
      recurrenceRuleId: 'recrule_01',
    })
    vi.mocked(reminders.due).mockResolvedValue([recurringReminder])

    const result = await service.materialize(NOW)

    expect(recurrence.retrieve).not.toHaveBeenCalled()
    expect(repository.enqueue).not.toHaveBeenCalled()
    expect(result).toEqual({ materialized: 0 })
  })

  it('materializes absolute due alerts into outbox', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const absAlert = createAbsoluteAlertFixture()
    vi.mocked(alerts.absoluteDue).mockResolvedValue([absAlert as never])

    const result = await service.materialize(NOW)

    expect(alerts.absoluteDue).toHaveBeenCalledWith(NOW, 500)
    expect(repository.enqueue).toHaveBeenCalledTimes(1)
    expect(repository.enqueue).toHaveBeenCalledWith({
      tenantId: 'work_tnt_kingston_01',
      sourceType: 'ALERT',
      sourceId: 'alert_abs_01',
      occurrenceKey: '2026-08-30T11:30:00.000Z',
      userId: 'usr_tariq_01',
      channel: 'NOTIFICATION',
      deliverAt: new Date('2026-08-30T11:30:00.000Z'),
      payload: {
        object: 'work_alert',
        alertId: 'alert_abs_01',
        taskId: 'task_kin_01',
        eventId: null,
        title: 'Depot Generator Inspection',
      },
    })
    expect(result).toEqual({ materialized: 1 })
  })

  it('materializes relative candidate alerts when computed deliverAt <= now', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const relAlert = createRelativeAlertFixture()
    vi.mocked(alerts.relativeCandidates).mockResolvedValue([relAlert as never])

    const result = await service.materialize(NOW)

    expect(alerts.relativeCandidates).toHaveBeenCalledWith(500)
    expect(repository.enqueue).toHaveBeenCalledTimes(1)
    expect(repository.enqueue).toHaveBeenCalledWith({
      tenantId: 'work_tnt_kingston_01',
      sourceType: 'ALERT',
      sourceId: 'alert_rel_01',
      occurrenceKey: '2026-08-30T12:15:00.000Z',
      userId: 'usr_tariq_01',
      channel: 'EMAIL',
      deliverAt: new Date('2026-08-30T11:45:00.000Z'),
      payload: {
        object: 'work_alert',
        alertId: 'alert_rel_01',
        taskId: 'task_kin_02',
        eventId: null,
        title: 'Spanish Town Delivery Task',
      },
    })
    expect(result).toEqual({ materialized: 1 })
  })

  it('skips relative alerts whose computed deliverAt is in the future', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const futureRelAlert = createRelativeAlertFixture({
      task: {
        dueAt: new Date('2026-08-30T14:00:00.000Z'), // deliverAt = 14:00 - 30m = 13:30 > NOW
        title: 'Future Task',
      },
    })
    vi.mocked(alerts.relativeCandidates).mockResolvedValue([
      futureRelAlert as never,
    ])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).not.toHaveBeenCalled()
    expect(result).toEqual({ materialized: 0 })
  })

  it('skips relative alerts with missing parent base date', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const alertNoBase = createRelativeAlertFixture({
      task: { dueAt: null, title: 'No Due Date Task' },
      event: null,
    })
    vi.mocked(alerts.relativeCandidates).mockResolvedValue([
      alertNoBase as never,
    ])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).not.toHaveBeenCalled()
    expect(result).toEqual({ materialized: 0 })
  })

  it('dispatches pending notification rows successfully and stamps source delivered', async () => {
    const row = createPendingOutboxRow()
    vi.mocked(repository.pending).mockResolvedValue([row as never])
    const mockGateway: NotificationGateway = {
      dispatch: vi.fn().mockResolvedValue(undefined),
    }

    const result = await service.dispatch(NOW, mockGateway)

    expect(repository.pending).toHaveBeenCalledWith(NOW, 100)
    expect(mockGateway.dispatch).toHaveBeenCalledWith({
      userId: 'usr_tariq_01',
      channel: 'NOTIFICATION',
      source: {
        type: 'REMINDER',
        id: 'reminder_kin_01',
        occurrenceKey: '2026-08-30T11:00:00.000Z',
      },
      payload: row.payload,
    })
    expect(repository.markDispatched).toHaveBeenCalledWith('outbox_01')
    expect(repository.markSourceDelivered).toHaveBeenCalledWith(
      'REMINDER',
      'reminder_kin_01'
    )
    expect(result).toEqual({ dispatched: 1, failed: 0 })
  })

  it('marks outbox row failed when gateway dispatch throws', async () => {
    const row = createPendingOutboxRow()
    vi.mocked(repository.pending).mockResolvedValue([row as never])
    const mockGateway: NotificationGateway = {
      dispatch: vi
        .fn()
        .mockRejectedValue(new Error('Push service connection refused')),
    }

    const result = await service.dispatch(NOW, mockGateway)

    expect(mockGateway.dispatch).toHaveBeenCalledTimes(1)
    expect(repository.markFailed).toHaveBeenCalledWith(
      'outbox_01',
      'Push service connection refused'
    )
    expect(repository.markDispatched).not.toHaveBeenCalled()
    expect(repository.markSourceDelivered).not.toHaveBeenCalled()
    expect(result).toEqual({ dispatched: 0, failed: 1 })
  })

  it('marks outbox row failed with fallback message when non-Error object is thrown', async () => {
    const row = createPendingOutboxRow()
    vi.mocked(repository.pending).mockResolvedValue([row as never])
    const mockGateway: NotificationGateway = {
      dispatch: vi.fn().mockRejectedValue('fatal network timeout'),
    }

    const result = await service.dispatch(NOW, mockGateway)

    expect(repository.markFailed).toHaveBeenCalledWith(
      'outbox_01',
      'Unknown notification dispatch failure.'
    )
    expect(result).toEqual({ dispatched: 0, failed: 1 })
  })

  it('runs complete materialize and dispatch loop returning work_notification_run object', async () => {
    const reminderRow = createReminderFixture()
    const outboxRow = createPendingOutboxRow()
    vi.mocked(reminders.due).mockResolvedValue([reminderRow])
    vi.mocked(repository.pending).mockResolvedValue([outboxRow as never])
    const mockGateway: NotificationGateway = {
      dispatch: vi.fn().mockResolvedValue(undefined),
    }

    const result = await service.run(NOW, mockGateway)

    expect(result).toEqual({
      object: 'work_notification_run',
      materialized: 1,
      dispatched: 1,
      failed: 0,
      at: 1_788_091_200,
    })
  })

  it('returns an empty run summary when nothing is due or pending', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    vi.mocked(alerts.absoluteDue).mockResolvedValue([])
    vi.mocked(alerts.relativeCandidates).mockResolvedValue([])
    vi.mocked(repository.pending).mockResolvedValue([])

    const result = await service.run(NOW)

    expect(result).toEqual({
      object: 'work_notification_run',
      materialized: 0,
      dispatched: 0,
      failed: 0,
      at: 1_788_091_200,
    })
  })

  it('honors batch limit 500 on due reminders and 100 on pending dispatch', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    vi.mocked(repository.pending).mockResolvedValue([])

    await service.run(NOW)

    expect(reminders.due).toHaveBeenCalledWith(NOW, 500)
    expect(repository.pending).toHaveBeenCalledWith(NOW, 100)
  })

  it('a due reminder exactly at now is materialized once', async () => {
    const boundary = createReminderFixture({ remindAt: NOW })
    vi.mocked(reminders.due).mockResolvedValue([boundary])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ materialized: 1 })
  })

  it('a reminder due one second before now is materialized once', async () => {
    const justDue = createReminderFixture({
      remindAt: new Date(NOW.getTime() - 1000),
    })
    vi.mocked(reminders.due).mockResolvedValue([justDue])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ materialized: 1 })
  })

  it('skips a recurring reminder whose rule lookup returns an error value', async () => {
    const recurringReminder = createReminderFixture({
      recurrenceRuleId: 'recrule_missing',
    })
    vi.mocked(reminders.due).mockResolvedValue([recurringReminder])
    vi.mocked(prisma.workTenant.findUnique).mockResolvedValue({
      id: 'work_tnt_kingston_01',
      organizationId: 'org_kingston_central',
    } as never)
    vi.mocked(recurrence.retrieve).mockResolvedValue({
      code: 'work/recurrence-rule-not-found',
      message: 'Recurrence rule not found.',
      httpStatus: 404,
    } as never)

    const result = await service.materialize(NOW)

    expect(occurrencesBetween).not.toHaveBeenCalled()
    expect(repository.enqueue).not.toHaveBeenCalled()
    expect(result).toEqual({ materialized: 0 })
  })

  it('uses the occurrence window of 25 hours before now', async () => {
    const recurringReminder = createReminderFixture({
      recurrenceRuleId: 'recrule_01',
    })
    vi.mocked(reminders.due).mockResolvedValue([recurringReminder])
    vi.mocked(prisma.workTenant.findUnique).mockResolvedValue({
      id: 'work_tnt_kingston_01',
      organizationId: 'org_kingston_central',
    } as never)
    vi.mocked(recurrence.retrieve).mockResolvedValue({
      object: 'recurrence_rule',
      id: 'recrule_01',
      frequency: 'DAILY',
      rrule: 'FREQ=DAILY',
    } as never)
    vi.mocked(occurrencesBetween).mockReturnValue([])

    await service.materialize(NOW)

    expect(occurrencesBetween).toHaveBeenCalledWith(
      expect.any(Object),
      new Date('2026-08-30T11:00:00.000Z'),
      new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
      NOW
    )
  })

  it('emits a payload with a null context for reminders without host context', async () => {
    const contextless = createReminderFixture({
      contextService: null,
      contextResource: null,
      contextId: null,
    })
    vi.mocked(reminders.due).mockResolvedValue([contextless])

    await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ context: null }),
      })
    )
  })

  it('uses EMAIL channel for absolute alerts with EMAIL action', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const emailAlert = createAbsoluteAlertFixture({
      action: 'EMAIL',
      triggerAt: new Date('2026-08-30T11:00:00.000Z'),
    })
    vi.mocked(alerts.absoluteDue).mockResolvedValue([emailAlert as never])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'ALERT',
        channel: 'EMAIL',
        payload: expect.objectContaining({ object: 'work_alert' }),
      })
    )
    expect(result).toEqual({ materialized: 1 })
  })

  it('uses the event start as the base for relative alerts on events', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const eventAlert = createRelativeAlertFixture({
      task: null,
      event: {
        startAt: new Date('2026-08-30T12:30:00.000Z'),
        startDate: null,
        title: 'Port Inspection',
      },
    })
    vi.mocked(alerts.relativeCandidates).mockResolvedValue([
      eventAlert as never,
    ])

    const result = await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'alert_rel_01',
        deliverAt: new Date('2026-08-30T12:00:00.000Z'),
      })
    )
    expect(result).toEqual({ materialized: 1 })
  })

  it('aborts before enqueueing the next reminder when an enqueue throws', async () => {
    const first = createReminderFixture({ id: 'reminder_first' })
    const second = createReminderFixture({ id: 'reminder_second' })
    vi.mocked(reminders.due).mockResolvedValue([first, second])
    vi.mocked(repository.enqueue).mockRejectedValueOnce(
      new Error('database connection lost')
    )

    await expect(service.materialize(NOW)).rejects.toThrow(
      'database connection lost'
    )

    expect(repository.enqueue).toHaveBeenCalledTimes(1)
    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'reminder_first' })
    )
  })

  it('aborts materialization entirely when enqueue throws', async () => {
    const reminder = createReminderFixture({ id: 'reminder_boom' })
    vi.mocked(reminders.due).mockResolvedValue([reminder])
    vi.mocked(repository.enqueue).mockRejectedValue(
      new Error('database connection lost')
    )

    await expect(service.materialize(NOW)).rejects.toThrow(
      'database connection lost'
    )
  })

  it('dispatch continues with the next row when one gateway call fails', async () => {
    const first = createPendingOutboxRow({ id: 'outbox_first' })
    const second = createPendingOutboxRow({
      id: 'outbox_second',
      sourceId: 'reminder_second',
    })
    vi.mocked(repository.pending).mockResolvedValue([
      first as never,
      second as never,
    ])
    const mockGateway: NotificationGateway = {
      dispatch: vi
        .fn()
        .mockRejectedValueOnce(new Error('push timeout'))
        .mockResolvedValueOnce(undefined),
    }

    const result = await service.dispatch(NOW, mockGateway)

    expect(mockGateway.dispatch).toHaveBeenCalledTimes(2)
    expect(repository.markFailed).toHaveBeenCalledWith(
      'outbox_first',
      'push timeout'
    )
    expect(repository.markDispatched).toHaveBeenCalledWith('outbox_second')
    expect(repository.markSourceDelivered).toHaveBeenCalledWith(
      'REMINDER',
      'reminder_second'
    )
    expect(result).toEqual({ dispatched: 1, failed: 1 })
  })

  it('idempotency: multiple occurrences across retries preserve unique occurrenceKey', async () => {
    const recurringReminder = createReminderFixture({
      recurrenceRuleId: 'recrule_01',
    })
    vi.mocked(reminders.due).mockResolvedValue([recurringReminder])
    vi.mocked(prisma.workTenant.findUnique).mockResolvedValue({
      id: 'work_tnt_kingston_01',
      organizationId: 'org_kingston_central',
    } as never)
    vi.mocked(recurrence.retrieve).mockResolvedValue({
      object: 'recurrence_rule',
      id: 'recrule_01',
      frequency: 'DAILY',
      rrule: 'FREQ=DAILY',
    } as never)
    const occ = new Date('2026-08-30T11:00:00.000Z')
    vi.mocked(occurrencesBetween).mockReturnValue([occ])

    await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        occurrenceKey: '2026-08-30T11:00:00.000Z',
      })
    )
  })

  it('emits a fallback title for alerts without a resolved parent', async () => {
    vi.mocked(reminders.due).mockResolvedValue([])
    const bareAlert = createAbsoluteAlertFixture({
      task: null,
      event: null,
    })
    vi.mocked(alerts.absoluteDue).mockResolvedValue([bareAlert as never])

    await service.materialize(NOW)

    expect(repository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ title: '876 Work' }),
      })
    )
  })
})
