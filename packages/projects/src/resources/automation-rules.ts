import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  automationRuleListSchema,
  automationRuleSchema,
  automationRunListSchema,
  automationTestSchema,
  type AutomationAction,
  type AutomationTrigger,
  type LayoutCondition,
  type RequestOptions,
} from '../types'

export interface CreateAutomationRuleInput {
  projectId?: string | null
  name: string
  enabled?: boolean
  trigger: AutomationTrigger
  conditions?: LayoutCondition[]
  actions: AutomationAction[]
  webhookSecret?: string | null
}

export interface UpdateAutomationRuleInput {
  projectId?: string | null
  name?: string
  enabled?: boolean
  trigger?: AutomationTrigger
  conditions?: LayoutCondition[]
  actions?: AutomationAction[]
  webhookSecret?: string | null
}

export interface TestAutomationRuleInput {
  subjectId: string
  projectId?: string
}

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/automation-rules`
}

export function createAutomationRulesResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        automationRuleListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateAutomationRuleInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        automationRuleSchema
      )
    },
    retrieve(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        automationRuleSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateAutomationRuleInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        automationRuleSchema
      )
    },
    remove(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        automationRuleSchema
      )
    },
    listRuns(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/runs`,
          signal: options.signal,
        },
        automationRunListSchema
      )
    },
    test(
      organizationId: string,
      id: string,
      input: TestAutomationRuleInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/test`,
          body: input,
          signal: options.signal,
        },
        automationTestSchema
      )
    },
  }
}
