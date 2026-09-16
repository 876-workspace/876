'use client'

import { request } from './request'

export interface BlueprintTransitionDto {
  id: string | null
  fromStateKey: string | null
  toStateKey: string
  name: string
  requiredPermission: string | null
  requiredFieldKeys: string[]
  requiresComment: boolean
}

export interface WorkflowBlueprintDto {
  object: string
  workItemTypeId: string
  updatedAt: number | null
  transitions: BlueprintTransitionDto[]
}

export interface BlueprintTransitionInput {
  fromStateKey?: string | null
  toStateKey: string
  name: string
  requiredPermission?: string | null
  requiredFieldKeys?: string[]
  requiresComment?: boolean
}

function blueprintPath(workItemTypeId: string): string {
  return `/api/workflows/${encodeURIComponent(workItemTypeId)}/blueprint`
}

export const workflowsClient = {
  getBlueprint(workItemTypeId: string) {
    return request<WorkflowBlueprintDto>(blueprintPath(workItemTypeId))
  },
  putBlueprint(
    workItemTypeId: string,
    input: { transitions: BlueprintTransitionInput[] }
  ) {
    return request<WorkflowBlueprintDto>(blueprintPath(workItemTypeId), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
}
