import type {
  AutomationAction as UiAutomationAction,
  AutomationCondition as UiAutomationCondition,
  AutomationRule as UiAutomationRule,
  AutomationTrigger as UiAutomationTrigger,
  Blueprint as UiBlueprint,
  Transition as UiTransition,
} from '@876/projects-ui/automation/types'

import type {
  AutomationActionInput,
  AutomationConditionOp,
  AutomationTriggerInput,
  ServiceAutomationRule,
  ServiceBlueprint,
  ServiceBlueprintInput,
  ServiceRuleInput,
} from '@/types/automations'

const TRIGGER_VALUES: readonly string[] = [
  'work-item.created',
  'work-item.updated',
  'work-item.state-changed',
  'phase.completed',
  'due-date.approaching',
  'time-entry.submitted',
  'budget.threshold-reached',
]

const CONDITION_OP_VALUES: readonly string[] = [
  'equals',
  'not-equals',
  'in',
  'is-empty',
  'is-not-empty',
]

export function toAutomationTrigger(value: string): AutomationTriggerInput {
  if (TRIGGER_VALUES.includes(value)) return value as AutomationTriggerInput
  return 'work-item.created'
}

function toConditionOp(value: string): AutomationConditionOp {
  if (CONDITION_OP_VALUES.includes(value)) return value as AutomationConditionOp
  return 'equals'
}

function textParam(
  params: Record<string, string | number | boolean | null>,
  key: string
): string {
  const value = params[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return ''
}

function numberParam(
  params: Record<string, string | number | boolean | null>,
  key: string
): number {
  const value = params[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function uiActionToService(
  action: UiAutomationAction
): AutomationActionInput {
  const params = action.params
  switch (action.type) {
    case 'set-field':
      return {
        type: 'set-field',
        fieldKey: textParam(params, 'fieldKey'),
        value: params['value'] ?? null,
      }
    case 'assign':
      return {
        type: 'assign',
        userId: textParam(params, 'assigneeId') || textParam(params, 'userId'),
      }
    case 'add-label':
      return { type: 'add-label', label: textParam(params, 'label') }
    case 'remove-label':
      return { type: 'remove-label', label: textParam(params, 'label') }
    case 'create-reminder': {
      const days = numberParam(params, 'daysFromNow')
      const title = textParam(params, 'title')
      return {
        type: 'create-reminder',
        ...(title ? { title } : {}),
        offsetMinutesBeforeDue: Math.max(0, Math.round(days * 1440)),
      }
    }
    case 'create-event': {
      const days = numberParam(params, 'daysFromNow')
      const title = textParam(params, 'title')
      return {
        type: 'create-event',
        title,
        startsAt: Math.floor(Date.now() / 1000) + Math.max(0, days) * 86400,
      }
    }
    case 'notify':
      return {
        type: 'notify',
        userId: textParam(params, 'userId'),
        title: textParam(params, 'message') || textParam(params, 'title'),
      }
    case 'call-webhook':
      return { type: 'call-webhook', url: textParam(params, 'url') }
    case 'create-sub-item':
      return { type: 'create-sub-item', title: textParam(params, 'title') }
  }
}

export function serviceActionToUi(
  action: AutomationActionInput
): UiAutomationAction {
  switch (action.type) {
    case 'set-field': {
      const value = action.value
      return {
        type: 'set-field',
        params: {
          fieldKey: action.fieldKey,
          value: Array.isArray(value) ? value.join(', ') : (value ?? ''),
        },
      }
    }
    case 'assign':
      return { type: 'assign', params: { assigneeId: action.userId } }
    case 'add-label':
      return { type: 'add-label', params: { label: action.label } }
    case 'remove-label':
      return { type: 'remove-label', params: { label: action.label } }
    case 'create-reminder':
      return {
        type: 'create-reminder',
        params: {
          title: action.title ?? '',
          daysFromNow:
            action.offsetMinutesBeforeDue == null
              ? 0
              : Math.max(0, Math.round(action.offsetMinutesBeforeDue / 1440)),
        },
      }
    case 'create-event':
      return {
        type: 'create-event',
        params: {
          title: action.title,
          daysFromNow: Math.max(
            0,
            Math.round(
              (action.startsAt - Math.floor(Date.now() / 1000)) / 86400
            )
          ),
        },
      }
    case 'notify':
      return {
        type: 'notify',
        params: { userId: action.userId, message: action.title },
      }
    case 'call-webhook':
      return { type: 'call-webhook', params: { url: action.url } }
    case 'create-sub-item':
      return { type: 'create-sub-item', params: { title: action.title } }
  }
}

function serviceConditionToUi(condition: {
  fieldKey: string
  op: string
  value?: string | string[]
}): UiAutomationCondition {
  if (condition.op === 'is-empty' || condition.op === 'is-not-empty')
    return { fieldKey: condition.fieldKey, op: condition.op }
  return {
    fieldKey: condition.fieldKey,
    op: condition.op,
    value: condition.value,
  }
}

export function serviceRuleToUi(rule: ServiceAutomationRule): UiAutomationRule {
  return {
    object: 'projects.automation-rule',
    id: rule.id,
    projectId: rule.projectId,
    name: rule.name,
    enabled: rule.enabled,
    trigger: toAutomationTrigger(rule.trigger) as UiAutomationTrigger,
    conditions: rule.conditions.map(serviceConditionToUi),
    actions: rule.actions.map(serviceActionToUi),
    hasWebhookSecret: rule.hasWebhookSecret,
    updatedAt: rule.updatedAt,
  }
}

export function uiRuleToServiceInput(
  rule: UiAutomationRule,
  overrides?: { projectId?: string | null }
): ServiceRuleInput {
  return {
    projectId:
      overrides && 'projectId' in overrides
        ? overrides.projectId
        : rule.projectId,
    name: rule.name,
    enabled: rule.enabled,
    trigger: toAutomationTrigger(rule.trigger),
    conditions: rule.conditions.map((condition) => ({
      fieldKey: condition.fieldKey,
      op: toConditionOp(condition.op),
      ...(condition.value === undefined ? {} : { value: condition.value }),
    })),
    actions: rule.actions.map(uiActionToService),
  }
}

export function blankUiRule(): UiAutomationRule {
  return {
    object: 'projects.automation-rule',
    id: 'new',
    projectId: null,
    name: '',
    enabled: true,
    trigger: 'work-item.created',
    conditions: [],
    actions: [{ type: 'notify', params: { userId: '', message: '' } }],
    hasWebhookSecret: false,
    updatedAt: 0,
  }
}

export function serviceBlueprintToUi(blueprint: ServiceBlueprint): UiBlueprint {
  return {
    object: 'projects.blueprint',
    workItemTypeId: blueprint.workItemTypeId,
    transitions: blueprint.transitions.map((transition) => ({
      id: transition.id,
      fromStateKey: transition.fromStateKey,
      toStateKey: transition.toStateKey,
      name: transition.name,
      requiredPermission: transition.requiredPermission,
      requiredFieldKeys: transition.requiredFieldKeys,
      requiresComment: transition.requiresComment,
    })),
    updatedAt: blueprint.updatedAt ?? 0,
  }
}

export function uiTransitionsToServiceInput(
  transitions: UiTransition[]
): ServiceBlueprintInput {
  return {
    transitions: transitions.map((transition) => ({
      fromStateKey: transition.fromStateKey,
      toStateKey: transition.toStateKey,
      name: transition.name,
      requiredPermission: transition.requiredPermission,
      requiredFieldKeys: transition.requiredFieldKeys,
      requiresComment: transition.requiresComment,
    })),
  }
}
