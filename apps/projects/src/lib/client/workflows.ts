'use client'

import { request } from './request'

import type {
  BlueprintTransitionDto,
  BlueprintTransitionInput,
  WorkflowBlueprintDto,
} from '@/types/work-structure'

export type {
  BlueprintTransitionDto,
  BlueprintTransitionInput,
  WorkflowBlueprintDto,
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
