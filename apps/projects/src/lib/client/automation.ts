'use client'

import type {
  AutomationActionInput,
  AutomationTriggerInput,
  AutomationConditionInput,
  ServiceAutomationTest,
} from '@/lib/automation-mappers'

import { request } from './request'

export interface ServiceAutomationRuleDto {
  object: string
  id: string
  projectId: string | null
  name: string
  enabled: boolean
  trigger: AutomationTriggerInput
  conditions: AutomationConditionInput[]
  actions: AutomationActionInput[]
  hasWebhookSecret: boolean
  createdAt: number
  updatedAt: number
}

export interface ServiceAutomationRunDto {
  object: string
  id: string
  ruleId: string
  eventId: string
  status: 'succeeded' | 'failed' | 'skipped'
  errorCode: string | null
  attempt: number
  startedAt: number
  finishedAt: number
}

export interface AutomationRuleListDto {
  object: string
  data: ServiceAutomationRuleDto[]
}

export interface AutomationRunListDto {
  object: string
  data: ServiceAutomationRunDto[]
}

export interface CreateAutomationRuleParams {
  projectId?: string | null
  name: string
  enabled?: boolean
  trigger: AutomationTriggerInput
  conditions?: AutomationConditionInput[]
  actions: AutomationActionInput[]
  webhookSecret?: string | null
}

export interface UpdateAutomationRuleParams {
  projectId?: string | null
  name?: string
  enabled?: boolean
  trigger?: AutomationTriggerInput
  conditions?: AutomationConditionInput[]
  actions?: AutomationActionInput[]
  webhookSecret?: string | null
}

export const automationRulesClient = {
  list() {
    return request<AutomationRuleListDto>('/api/automation-rules')
  },
  create(params: CreateAutomationRuleParams) {
    return request<ServiceAutomationRuleDto>('/api/automation-rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  retrieve(ruleId: string) {
    return request<ServiceAutomationRuleDto>(
      `/api/automation-rules/${encodeURIComponent(ruleId)}`
    )
  },
  update(ruleId: string, params: UpdateAutomationRuleParams) {
    return request<ServiceAutomationRuleDto>(
      `/api/automation-rules/${encodeURIComponent(ruleId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  remove(ruleId: string) {
    return request<ServiceAutomationRuleDto>(
      `/api/automation-rules/${encodeURIComponent(ruleId)}`,
      { method: 'DELETE' }
    )
  },
  listRuns(ruleId: string) {
    return request<AutomationRunListDto>(
      `/api/automation-rules/${encodeURIComponent(ruleId)}/runs`
    )
  },
  test(ruleId: string, params: { subjectId: string; projectId?: string }) {
    return request<ServiceAutomationTest>(
      `/api/automation-rules/${encodeURIComponent(ruleId)}/test`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
}
