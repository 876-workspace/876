'use client'

import type {
  Comment,
  CreateCustomFieldInput,
  CreateIssueInput,
  CreateMilestoneInput,
  CreateWorkItemTypeInput,
  CreateWorkflowStateInput,
  CustomField,
  Issue,
  Label,
  Milestone,
  MilestoneComment,
  MilestoneDetail,
  Project,
  SetCustomFieldValueInput,
  UpdateCustomFieldInput,
  UpdateIssueInput,
  UpdateMilestoneInput,
  UpdateWorkItemTypeInput,
  UpdateWorkflowStateInput,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'

import { request } from './request'

type CreateIssueParams = Omit<CreateIssueInput, 'creatorUserId'>
type UpdateIssueParams = Omit<UpdateIssueInput, 'creatorUserId' | 'actorUserId'>
type CreatePhaseParams = CreateMilestoneInput & { ownerUserId?: string | null }
type UpdatePhaseParams = UpdateMilestoneInput & { ownerUserId?: string | null }

export const projectsClient = {
  create(params: { name: string; key?: string; description?: string | null }) {
    return request<Project>('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}

export const issuesClient = {
  create(params: CreateIssueParams) {
    return request<Issue>('/api/issues', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(issueRef: string, params: UpdateIssueParams) {
    return request<Issue>(`/api/issues/${encodeURIComponent(issueRef)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}

export const phasesClient = {
  create(params: CreatePhaseParams) {
    return request<MilestoneDetail>('/api/phases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(phaseId: string, params: UpdatePhaseParams) {
    return request<MilestoneDetail>(`/api/phases/${encodeURIComponent(phaseId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(phaseId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/phases/${encodeURIComponent(phaseId)}`,
      { method: 'DELETE' }
    )
  },
  clone(phaseId: string, params: { key: string; name: string }) {
    return request<MilestoneDetail>(
      `/api/phases/${encodeURIComponent(phaseId)}/clone`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  comments: {
    create(phaseId: string, body: string) {
      return request<MilestoneComment>(
        `/api/phases/${encodeURIComponent(phaseId)}/comments`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        }
      )
    },
    update(phaseId: string, commentId: string, body: string) {
      return request<MilestoneComment>(
        `/api/phases/${encodeURIComponent(phaseId)}/comments/${encodeURIComponent(commentId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        }
      )
    },
    delete(phaseId: string, commentId: string) {
      return request<{ object: string; id: string; deleted: true }>(
        `/api/phases/${encodeURIComponent(phaseId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE' }
      )
    },
  },
  customFields: {
    set(phaseId: string, customFields: SetCustomFieldValueInput[]) {
      return request<unknown[]>(
        `/api/phases/${encodeURIComponent(phaseId)}/custom-fields`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ customFields }),
        }
      )
    },
  },
}

function createWorkStructureClient<T, TCreate, TUpdate = TCreate>(
  path: string
) {
  return {
    create(params: TCreate) {
      return request<T>(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      })
    },
    update(id: string, params: TUpdate) {
      return request<T>(`${path}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      })
    },
    delete(id: string) {
      return request<{ object: string; id: string; deleted: true }>(
        `${path}/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
    },
  }
}

export const workItemTypesClient = createWorkStructureClient<
  WorkItemType,
  CreateWorkItemTypeInput,
  UpdateWorkItemTypeInput
>('/api/work-item-types')

export const workflowStatesClient = createWorkStructureClient<
  WorkflowState,
  CreateWorkflowStateInput,
  UpdateWorkflowStateInput
>('/api/workflow-states')

export const milestonesClient = createWorkStructureClient<
  Milestone,
  CreateMilestoneInput,
  UpdateMilestoneInput
>('/api/milestones')

export const customFieldsClient = createWorkStructureClient<
  CustomField,
  CreateCustomFieldInput,
  UpdateCustomFieldInput
>('/api/custom-fields')

export const labelsClient = {
  create(params: {
    name: string
    color?: string
    description?: string | null
  }) {
    return request<Label>('/api/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}

export const commentsClient = {
  create(params: { issueRef: string; body: string }) {
    return request<Comment>('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(commentId: string, params: { issueRef: string; body: string }) {
    return request<Comment>(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(commentId: string, issueRef: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/comments/${encodeURIComponent(commentId)}?issueRef=${encodeURIComponent(issueRef)}`,
      { method: 'DELETE' }
    )
  },
}
