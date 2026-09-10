export type WorkWidgetCapabilities = {
  canCreateTasks: boolean
  canEditTasks: boolean
  canDeleteTasks: boolean
  canAssignTasks: boolean
  canRespondTasks: boolean
  canCreateEvents: boolean
  canEditEvents: boolean
  canDeleteEvents: boolean
  canInviteEvents: boolean
  canRespondEvents: boolean
  canCreateReminders: boolean
  canEditReminders: boolean
  canDeleteReminders: boolean
  canCreateCalendars: boolean
  canEditCalendars: boolean
}

export const EMPTY_WORK_WIDGET_CAPABILITIES: WorkWidgetCapabilities = {
  canCreateTasks: false,
  canEditTasks: false,
  canDeleteTasks: false,
  canAssignTasks: false,
  canRespondTasks: false,
  canCreateEvents: false,
  canEditEvents: false,
  canDeleteEvents: false,
  canInviteEvents: false,
  canRespondEvents: false,
  canCreateReminders: false,
  canEditReminders: false,
  canDeleteReminders: false,
  canCreateCalendars: false,
  canEditCalendars: false,
}

export function resolveWorkWidgetCapabilities(
  effectivePermissions: ReadonlySet<string>
): WorkWidgetCapabilities {
  return {
    canCreateTasks: effectivePermissions.has('tasks.create'),
    canEditTasks: effectivePermissions.has('tasks.edit'),
    canDeleteTasks: effectivePermissions.has('tasks.delete'),
    canAssignTasks: effectivePermissions.has('tasks.assign'),
    canRespondTasks: effectivePermissions.has('tasks.respond'),
    canCreateEvents: effectivePermissions.has('events.create'),
    canEditEvents: effectivePermissions.has('events.edit'),
    canDeleteEvents: effectivePermissions.has('events.delete'),
    canInviteEvents: effectivePermissions.has('events.invite'),
    canRespondEvents: effectivePermissions.has('events.respond'),
    canCreateReminders: effectivePermissions.has('reminders.create'),
    canEditReminders: effectivePermissions.has('reminders.edit'),
    canDeleteReminders: effectivePermissions.has('reminders.delete'),
    canCreateCalendars: effectivePermissions.has('calendars.create'),
    canEditCalendars: effectivePermissions.has('calendars.edit'),
  }
}
