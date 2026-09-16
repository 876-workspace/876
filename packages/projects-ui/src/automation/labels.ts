import type { AutomationActionType, AutomationTrigger } from './types'

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  'work-item.created': 'Work item created',
  'work-item.updated': 'Work item updated',
  'work-item.state-changed': 'Work item state changed',
  'phase.completed': 'Phase completed',
  'due-date.approaching': 'Due date approaching',
  'time-entry.submitted': 'Time entry submitted',
  'budget.threshold-reached': 'Budget threshold reached',
}

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  'set-field': 'Set field',
  assign: 'Assign',
  'add-label': 'Add label',
  'remove-label': 'Remove label',
  'create-reminder': 'Create reminder',
  'create-event': 'Create event',
  notify: 'Notify',
  'call-webhook': 'Call webhook',
  'create-sub-item': 'Create sub item',
}

export const RUN_STATUS_LABELS: Record<string, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  skipped: 'Skipped',
}

export function triggerLabel(trigger: AutomationTrigger): string {
  return TRIGGER_LABELS[trigger]
}

export function actionLabel(action: AutomationActionType): string {
  return ACTION_LABELS[action]
}
