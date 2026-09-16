/** Canonical automation + blueprint contracts — phase 13 plan §Binding decisions. */

type Transition = {
  id: string | null
  fromStateKey: string | null
  toStateKey: string
  name: string
  requiredPermission: string | null
  requiredFieldKeys: string[]
  requiresComment: boolean
}

type Blueprint = {
  object: 'projects.blueprint'
  workItemTypeId: string
  transitions: Transition[]
  updatedAt: number
}

type AutomationTrigger =
  | 'work-item.created'
  | 'work-item.updated'
  | 'work-item.state-changed'
  | 'phase.completed'
  | 'due-date.approaching'
  | 'time-entry.submitted'
  | 'budget.threshold-reached'

type AutomationActionType =
  | 'set-field'
  | 'assign'
  | 'add-label'
  | 'remove-label'
  | 'create-reminder'
  | 'create-event'
  | 'notify'
  | 'call-webhook'
  | 'create-sub-item'

type AutomationAction = {
  type: AutomationActionType
  params: Record<string, string | number | boolean | null>
}

type AutomationCondition = {
  fieldKey: string
  op: string
  value?: string | string[]
}

type AutomationRule = {
  object: 'projects.automation-rule'
  id: string
  projectId: string | null
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  hasWebhookSecret: boolean
  updatedAt: number
}

type AutomationRun = {
  object: 'projects.automation-run'
  id: string
  ruleId: string
  eventId: string
  status: 'succeeded' | 'failed' | 'skipped'
  errorCode: string | null
  attempt: number
  startedAt: number
  finishedAt: number | null
}

type ProjectNotification = {
  object: 'projects.notification'
  id: string
  subjectType: string
  subjectId: string
  title: string
  body: string | null
  read: boolean
  createdAt: number
}

export type {
  Transition,
  Blueprint,
  AutomationTrigger,
  AutomationActionType,
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  AutomationRun,
  ProjectNotification,
}
