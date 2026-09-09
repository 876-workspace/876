export type WorkWidgetCapabilities = {
  canCreateTasks: boolean
  canEditTasks: boolean
  canDeleteTasks: boolean
  canCreateEvents: boolean
  canEditEvents: boolean
  canDeleteEvents: boolean
  canCreateReminders: boolean
  canEditReminders: boolean
  canDeleteReminders: boolean
}

export const EMPTY_WORK_WIDGET_CAPABILITIES: WorkWidgetCapabilities = {
  canCreateTasks: false,
  canEditTasks: false,
  canDeleteTasks: false,
  canCreateEvents: false,
  canEditEvents: false,
  canDeleteEvents: false,
  canCreateReminders: false,
  canEditReminders: false,
  canDeleteReminders: false,
}

export function resolveWorkWidgetCapabilities(
  effectivePermissions: ReadonlySet<string>
): WorkWidgetCapabilities {
  return {
    canCreateTasks: effectivePermissions.has('tasks.create'),
    canEditTasks: effectivePermissions.has('tasks.edit'),
    canDeleteTasks: effectivePermissions.has('tasks.delete'),
    canCreateEvents: effectivePermissions.has('events.create'),
    canEditEvents: effectivePermissions.has('events.edit'),
    canDeleteEvents: effectivePermissions.has('events.delete'),
    canCreateReminders: effectivePermissions.has('reminders.create'),
    canEditReminders: effectivePermissions.has('reminders.edit'),
    canDeleteReminders: effectivePermissions.has('reminders.delete'),
  }
}
