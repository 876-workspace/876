import { describe, expect, it } from 'vitest'

import {
  createWorkAlertInputSchema,
  createWorkEventInputSchema,
  createWorkEventParticipantInputSchema,
  createWorkRecurrenceRuleInputSchema,
  createWorkTaskAssignmentInputSchema,
  createWorkTaskInputSchema,
  updateWorkReminderInputSchema,
  updateWorkTaskInputSchema,
  workContextSchema,
  workTaskSchema,
} from './types'

const task = {
  object: 'task' as const,
  id: 'task_1',
  uid: 'task_1@work.876',
  organizationId: 'org_1',
  listId: 'tasklist_1',
  parentTaskId: null,
  context: null,
  links: [],
  title: 'Task',
  description: null,
  status: 'OPEN' as const,
  importance: 'NORMAL' as const,
  priorityId: null,
  assigneeId: null,
  assignments: [],
  startAt: null,
  startTimeZone: null,
  dueAt: null,
  dueTimeZone: null,
  estimatedDuration: null,
  percentComplete: 0,
  recurrenceRuleId: null,
  completedAt: null,
  completedBy: null,
  isOverdue: false,
  sortOrder: 0,
  createdBy: 'user_1',
  createdAt: 1,
  updatedAt: 1,
}

describe('Work Phase 2 contracts', () => {
  it('models cross-service context without a foreign key to the source service', () => {
    expect(
      workContextSchema.parse({
        service: 'crm',
        resource: 'request',
        id: 'req_1',
      })
    ).toEqual({ service: 'crm', resource: 'request', id: 'req_1' })
  })

  it('keeps general organization tasks first-class', () => {
    expect(
      createWorkTaskInputSchema.parse({
        title: 'Prepare rota',
        createdBy: 'user_1',
      })
    ).toMatchObject({ title: 'Prepare rota', createdBy: 'user_1' })
  })

  it('does not reintroduce request ownership into the canonical Task', () => {
    const result = workTaskSchema.parse({ ...task, requestId: 'req_1' })
    expect('requestId' in result).toBe(false)
  })

  it('requires task instants and IANA timezone identifiers as pairs', () => {
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'Task',
        startAt: 1_788_200_000,
        createdBy: 'user_1',
      }).success
    ).toBe(false)
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'Task',
        startAt: 1_788_200_000,
        startTimeZone: 'America/Jamaica',
        dueAt: 1_788_203_600,
        dueTimeZone: 'America/Jamaica',
        createdBy: 'user_1',
      }).success
    ).toBe(true)
  })

  it('rejects a task deadline before its scheduled start', () => {
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'Task',
        startAt: 20,
        startTimeZone: 'America/Jamaica',
        dueAt: 10,
        dueTimeZone: 'America/Jamaica',
        createdBy: 'user_1',
      }).success
    ).toBe(false)
  })

  it('supports delegation metadata without collapsing assignment into one task column', () => {
    expect(
      createWorkTaskAssignmentInputSchema.parse({
        targetType: 'USER',
        assigneeId: 'user_2',
        role: 'OWNER',
        assignedBy: 'user_1',
        delegatedFromAssignmentId: 'assign_1',
      })
    ).toMatchObject({
      assigneeId: 'user_2',
      delegatedFromAssignmentId: 'assign_1',
    })
  })

  it('enforces timed and all-day event shapes as mutually exclusive variants', () => {
    expect(
      createWorkEventInputSchema.safeParse({
        calendarId: 'cal_1',
        title: 'Review',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'America/Jamaica',
        createdBy: 'user_1',
      }).success
    ).toBe(true)
    expect(
      createWorkEventInputSchema.safeParse({
        calendarId: 'cal_1',
        title: 'Holiday',
        allDay: true,
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        createdBy: 'user_1',
      }).success
    ).toBe(true)
    expect(
      createWorkEventInputSchema.safeParse({
        calendarId: 'cal_1',
        title: 'Invalid mixed event',
        allDay: true,
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        startAt: 100,
        endAt: 200,
        timeZone: 'America/Jamaica',
        createdBy: 'user_1',
      }).success
    ).toBe(false)
  })

  it('requires internal participants to use IDs and external participants to use email', () => {
    expect(
      createWorkEventParticipantInputSchema.safeParse({
        kind: 'USER',
        participantId: 'user_2',
      }).success
    ).toBe(true)
    expect(
      createWorkEventParticipantInputSchema.safeParse({
        kind: 'EMAIL',
        email: 'outside@example.com',
      }).success
    ).toBe(true)
    expect(
      createWorkEventParticipantInputSchema.safeParse({
        kind: 'USER',
        email: 'outside@example.com',
      }).success
    ).toBe(false)
  })

  it('keeps standalone reminders separate from attached alerts', () => {
    expect(
      createWorkAlertInputSchema.safeParse({
        taskId: 'task_1',
        eventId: 'event_1',
        userId: 'user_1',
        triggerType: 'ABSOLUTE',
        triggerAt: 100,
        createdBy: 'user_1',
      }).success
    ).toBe(false)
    expect(
      createWorkAlertInputSchema.safeParse({
        taskId: 'task_1',
        userId: 'user_1',
        triggerType: 'RELATIVE',
        offsetSeconds: 900,
        createdBy: 'user_1',
      }).success
    ).toBe(true)
  })

  it('uses recurrence fields that map to RFC 5545 semantics', () => {
    const parsed = createWorkRecurrenceRuleInputSchema.parse({
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'WE', 'FR'],
      timeZone: 'America/Jamaica',
      createdBy: 'user_1',
    })
    expect(parsed.byDay).toEqual(['MO', 'WE', 'FR'])
    expect(
      createWorkRecurrenceRuleInputSchema.safeParse({
        frequency: 'MONTHLY',
        count: 5,
        untilAt: 1_800_000_000,
        timeZone: 'America/Jamaica',
        createdBy: 'user_1',
      }).success
    ).toBe(false)
  })

  it('rejects empty task and reminder patches', () => {
    expect(updateWorkTaskInputSchema.safeParse({}).success).toBe(false)
    expect(updateWorkReminderInputSchema.safeParse({}).success).toBe(false)
  })

  it('enforces text bounds at the service contract', () => {
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'x'.repeat(241),
        createdBy: 'user_1',
      }).success
    ).toBe(false)
    expect(
      createWorkTaskInputSchema.safeParse({
        title: 'Task',
        description: 'x'.repeat(10_001),
        createdBy: 'user_1',
      }).success
    ).toBe(false)
  })
})
