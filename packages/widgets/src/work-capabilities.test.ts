import { describe, expect, it } from 'vitest'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  resolveWorkWidgetCapabilities,
} from './work-capabilities'

describe('resolveWorkWidgetCapabilities', () => {
  it('keeps read-only Staff free of mutation controls', () => {
    expect(
      resolveWorkWidgetCapabilities(
        new Set([
          'my-work.view',
          'tasks.view',
          'reminders.view',
          'events.view',
          'calendars.view',
        ])
      )
    ).toEqual(EMPTY_WORK_WIDGET_CAPABILITIES)
  })

  it('separates self-response from assignment and invitation management', () => {
    const result = resolveWorkWidgetCapabilities(
      new Set(['tasks.respond', 'events.respond'])
    )
    expect(result.canRespondTasks).toBe(true)
    expect(result.canRespondEvents).toBe(true)
    expect(result.canAssignTasks).toBe(false)
    expect(result.canInviteEvents).toBe(false)
  })

  it('allows non-destructive Admin Work management without delete controls', () => {
    expect(
      resolveWorkWidgetCapabilities(
        new Set([
          'tasks.create',
          'tasks.edit',
          'tasks.assign',
          'tasks.respond',
          'reminders.create',
          'reminders.edit',
          'events.create',
          'events.edit',
          'events.invite',
          'events.respond',
          'calendars.create',
          'calendars.edit',
        ])
      )
    ).toEqual({
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: false,
      canAssignTasks: true,
      canRespondTasks: true,
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: false,
      canInviteEvents: true,
      canRespondEvents: true,
      canCreateReminders: true,
      canEditReminders: true,
      canDeleteReminders: false,
      canCreateCalendars: true,
      canEditCalendars: true,
    })
  })

  it('allows Super Admin destructive controls only when delete permissions exist', () => {
    const result = resolveWorkWidgetCapabilities(
      new Set([
        'tasks.create',
        'tasks.edit',
        'tasks.delete',
        'reminders.create',
        'reminders.edit',
        'reminders.delete',
        'events.create',
        'events.edit',
        'events.delete',
      ])
    )
    expect(result.canDeleteTasks).toBe(true)
    expect(result.canDeleteEvents).toBe(true)
    expect(result.canDeleteReminders).toBe(true)
  })
})
