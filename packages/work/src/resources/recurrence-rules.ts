import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workRecurrenceRuleListSchema,
  workRecurrenceRuleSchema,
  type CreateWorkRecurrenceRuleInput,
  type UpdateWorkRecurrenceRuleInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/recurrence-rules`
}

export function createRecurrenceRulesResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string) {
      return workRequest(runtime, { method: 'GET', path: root(organizationId) }, workRecurrenceRuleListSchema)
    },
    retrieve(organizationId: string, ruleId: string) {
      return workRequest(runtime, { method: 'GET', path: `${root(organizationId)}/${encodeURIComponent(ruleId)}` }, workRecurrenceRuleSchema)
    },
    create(organizationId: string, input: CreateWorkRecurrenceRuleInput) {
      return workRequest(runtime, { method: 'POST', path: root(organizationId), body: input }, workRecurrenceRuleSchema)
    },
    update(organizationId: string, ruleId: string, input: UpdateWorkRecurrenceRuleInput) {
      return workRequest(runtime, { method: 'PATCH', path: `${root(organizationId)}/${encodeURIComponent(ruleId)}`, body: input }, workRecurrenceRuleSchema)
    },
    delete(organizationId: string, ruleId: string) {
      return workRequest(runtime, { method: 'DELETE', path: `${root(organizationId)}/${encodeURIComponent(ruleId)}` }, z.object({ object: z.literal('recurrence_rule'), id: z.string(), deleted: z.literal(true) }))
    },
  }
}
