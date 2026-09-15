'use client'

import type {
  Comment,
  CreateCustomFieldInput,
  CreateMilestoneInput,
  CreateWorkItemTypeInput,
  CreateWorkflowStateInput,
  CustomField,
  Issue,
  Label,
  Milestone,
  Project,
  UpdateCustomFieldInput,
  UpdateIssueInput,
  UpdateMilestoneInput,
  UpdateWorkItemTypeInput,
  UpdateWorkflowStateInput,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'

import { request } from './request'

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
  create(params: {
    title: string
    projectId?: string
    description?: string | null
    status?: string
    typeKey?: string
    milestoneId?: string | null
    priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent'
    customFields?: Array<{
      fieldId: string
      value: string | number | boolean | string[] | null
    }>
  }) {
    return request<Issue>('/api/issues', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(issueRef: string, params: UpdateIssueInput) {
    return request<Issue>(`/api/issues/${encodeURIComponent(issueRef)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
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
