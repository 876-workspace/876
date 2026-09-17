'use client'

import type {
  AutomationRuleListDto,
  AutomationRunListDto,
  CreateAutomationRuleParams,
  ServiceAutomationRuleDto,
  ServiceAutomationTest,
  UpdateAutomationRuleParams,
} from '@/types/automations'

import { request } from './request'

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
