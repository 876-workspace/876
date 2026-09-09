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

  it('allows non-destructive Admin mutations without delete controls', () => {
    expect(
      resolveWorkWidgetCapabilities(
        new Set([
          'tasks.create',
          'tasks.edit',
          'reminders.create',
          'reminders.edit',
          'events.create',
          'events.edit',
        ])
      )
    ).toEqual({
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: false,
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: false,
      canCreateReminders: true,
      canEditReminders: true,
      canDeleteReminders: false,
    })
  })

  it('allows Super Admin destructive controls only when delete permissions exist', () => {
    expect(
      resolveWorkWidgetCapabilities(
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
    ).toEqual({
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: true,
      canCreateEvents: true,
      canEditEvents: true,
      canDeleteEvents: true,
      canCreateReminders: true,
      canEditReminders: true,
      canDeleteReminders: true,
    })
  })
})
