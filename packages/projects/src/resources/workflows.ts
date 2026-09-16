import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  workflowBlueprintSchema,
  type RequestOptions,
  type WorkflowBlueprint,
} from '../types'

export interface BlueprintTransitionInput {
  fromStateKey?: string | null
  toStateKey: string
  name: string
  requiredPermission?: string | null
  requiredFieldKeys?: string[]
  requiresComment?: boolean
}

export interface PutBlueprintInput {
  transitions: BlueprintTransitionInput[]
}

function root(organizationId: string, workItemTypeId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/workflows/${encodeURIComponent(workItemTypeId)}/blueprint`
}

export function createWorkflowsResource(runtime: Runtime) {
  return {
    getBlueprint(
      organizationId: string,
      workItemTypeId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId, workItemTypeId),
          signal: options.signal,
        },
        workflowBlueprintSchema
      )
    },
    putBlueprint(
      organizationId: string,
      workItemTypeId: string,
      input: PutBlueprintInput,
      options: RequestOptions = {}
    ): Promise<import('../types').Result<WorkflowBlueprint>> {
      return request(
        runtime,
        {
          method: 'PUT',
          path: root(organizationId, workItemTypeId),
          body: input,
          signal: options.signal,
        },
        workflowBlueprintSchema
      )
    },
  }
}
