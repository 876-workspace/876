import type {
  AutomationRule as ServiceAutomationRule,
  AutomationRun as ServiceAutomationRun,
} from '@876/projects'
import type {
  AutomationRule as UiAutomationRule,
  AutomationRun as UiAutomationRun,
  AutomationTrigger as UiAutomationTrigger,
} from '@876/projects-ui/automation/types'

const TRIGGER_VALUES: readonly UiAutomationTrigger[] = [
  'work-item.created',
  'work-item.updated',
  'work-item.state-changed',
  'phase.completed',
  'due-date.approaching',
  'time-entry.submitted',
  'budget.threshold-reached',
]

function toUiTrigger(value: string): UiAutomationTrigger {
  const found = TRIGGER_VALUES.find((entry) => entry === value)
  return found ?? 'work-item.created'
}

function serviceActionToParams(
  action: ServiceAutomationRule['actions'][number]
): Record<string, string | number | boolean | null> {
  switch (action.type) {
    case 'set-field':
      return {
        fieldKey: action.fieldKey,
        value: Array.isArray(action.value)
          ? action.value.join(', ')
          : action.value,
      }
    case 'assign':
      return { userId: action.userId }
    case 'add-label':
    case 'remove-label':
      return { label: action.label }
    case 'create-reminder': {
      const params: Record<string, string | number | boolean | null> = {}
      if (action.title !== undefined) params.title = action.title
      if (action.remindAt !== undefined) params.remindAt = action.remindAt
      if (action.offsetMinutesBeforeDue !== undefined)
        params.offsetMinutesBeforeDue = action.offsetMinutesBeforeDue
      return params
    }
    case 'create-event': {
      const params: Record<string, string | number | boolean | null> = {
        title: action.title,
        startsAt: action.startsAt,
      }
      if (action.description !== undefined && action.description !== null)
        params.description = action.description
      if (action.endsAt !== undefined && action.endsAt !== null)
        params.endsAt = action.endsAt
      return params
    }
    case 'notify': {
      const params: Record<string, string | number | boolean | null> = {
        userId: action.userId,
        title: action.title,
      }
      if (action.kind !== undefined) params.kind = action.kind
      return params
    }
    case 'call-webhook':
      return { url: action.url }
    case 'create-sub-item': {
      const params: Record<string, string | number | boolean | null> = {
        title: action.title,
      }
      if (action.typeKey !== undefined) params.typeKey = action.typeKey
      if (
        action.assigneeUserId !== undefined &&
        action.assigneeUserId !== null
      )
        params.assigneeUserId = action.assigneeUserId
      return params
    }
  }
}

export function toUiAutomationRule(
  rule: ServiceAutomationRule
): UiAutomationRule {
  return {
    object: 'projects.automation-rule',
    id: rule.id,
    projectId: rule.projectId,
    name: rule.name,
    enabled: rule.enabled,
    trigger: toUiTrigger(rule.trigger),
    conditions: rule.conditions.map((condition) => ({
      fieldKey: condition.fieldKey,
      op: condition.op,
      ...(condition.value === undefined ? {} : { value: condition.value }),
    })),
    actions: rule.actions.map((action) => ({
      type: action.type,
      params: serviceActionToParams(action),
    })),
    hasWebhookSecret: rule.hasWebhookSecret,
    updatedAt: rule.updatedAt,
  }
}

export function toUiAutomationRun(run: ServiceAutomationRun): UiAutomationRun {
  return {
    object: 'projects.automation-run',
    id: run.id,
    ruleId: run.ruleId,
    eventId: run.eventId,
    status: run.status,
    errorCode: run.errorCode,
    attempt: run.attempt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  }
}
