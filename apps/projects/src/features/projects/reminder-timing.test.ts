import type { Reminder } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import {
  formatReminderTiming,
  reminderTargetInput,
  reminderTargetMatches,
  remindersForTarget,
} from './reminder-timing'

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    object: 'projects.reminder',
    id: 'rem_1',
    tenantId: 'tnt_1',
    issueId: 'iss_1',
    milestoneId: null,
    eventId: null,
    remindAt: null,
    offsetMinutesBeforeDue: 120,
    recurrence: null,
    channel: 'in-app',
    createdBy: 'usr_1',
    active: true,
    createdAt: 1788400000,
    updatedAt: 1788400000,
    ...overrides,
  }
}

describe('formatReminderTiming', () => {
  it('states an offset in the units a person chose', () => {
    expect(formatReminderTiming(reminder())).toBe(
      'Due 2 hours before the due date'
    )
  })

  it('names the target date it measures from', () => {
    expect(formatReminderTiming(reminder(), 'the start')).toBe(
      'Due 2 hours before the start'
    )
  })

  it('keeps whole days and whole hours readable', () => {
    expect(
      formatReminderTiming(reminder({ offsetMinutesBeforeDue: 1_440 }))
    ).toBe('Due 1 day before the due date')
    expect(formatReminderTiming(reminder({ offsetMinutesBeforeDue: 60 }))).toBe(
      'Due 1 hour before the due date'
    )
  })

  it('falls back to minutes when the offset is not a whole unit', () => {
    expect(formatReminderTiming(reminder({ offsetMinutesBeforeDue: 90 }))).toBe(
      'Due 90 minutes before the due date'
    )
    expect(formatReminderTiming(reminder({ offsetMinutesBeforeDue: 1 }))).toBe(
      'Due 1 minute before the due date'
    )
  })

  it('reads a zero offset as the due date itself', () => {
    expect(formatReminderTiming(reminder({ offsetMinutesBeforeDue: 0 }))).toBe(
      'Due at the due date'
    )
  })

  it('states an absolute time for a reminder set to a moment', () => {
    expect(
      formatReminderTiming(
        reminder({ offsetMinutesBeforeDue: null, remindAt: 1789894800 })
      )
    ).toBe('Due Sep 20, 2026, 9:00 AM')
  })

  it('never claims the reminder is delivered', () => {
    const copy = [
      formatReminderTiming(reminder()),
      formatReminderTiming(reminder({ offsetMinutesBeforeDue: 0 })),
      formatReminderTiming(
        reminder({ offsetMinutesBeforeDue: null, remindAt: 1789894800 })
      ),
      formatReminderTiming(reminder({ offsetMinutesBeforeDue: null })),
    ]

    for (const line of copy)
      expect(line).not.toMatch(/notify|notified|email|sent|we will/i)
  })

  it('says so when no time is set', () => {
    expect(
      formatReminderTiming(reminder({ offsetMinutesBeforeDue: null }))
    ).toBe('No time set')
  })
})

describe('reminder targets', () => {
  it('matches a reminder by the record it was set on', () => {
    expect(reminderTargetMatches(reminder(), { issueId: 'iss_1' })).toBe(true)
    expect(reminderTargetMatches(reminder(), { issueId: 'iss_2' })).toBe(false)
  })

  it('matches event reminders', () => {
    const event = reminder({ issueId: null, eventId: 'evt_1' })

    expect(reminderTargetMatches(event, { eventId: 'evt_1' })).toBe(true)
    expect(reminderTargetMatches(event, { milestoneId: 'evt_1' })).toBe(false)
  })

  it('keeps only the reminders for the target record', () => {
    const mine = reminder({ id: 'rem_mine' })
    const other = reminder({ id: 'rem_other', issueId: 'iss_2' })

    expect(
      remindersForTarget([mine, other], { issueId: 'iss_1' }).map(
        ({ id }) => id
      )
    ).toEqual(['rem_mine'])
  })

  it('sends exactly one target field to the API', () => {
    expect(reminderTargetInput({ issueId: 'iss_1' })).toEqual({
      issueId: 'iss_1',
    })
    expect(reminderTargetInput({ eventId: 'evt_1' })).toEqual({
      eventId: 'evt_1',
    })
    expect(reminderTargetInput({ milestoneId: 'mst_1' })).toEqual({
      milestoneId: 'mst_1',
    })
  })
})
