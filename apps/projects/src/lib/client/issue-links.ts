'use client'

import type {
  IssueDependency,
  IssueDependencyType,
  IssueRelation,
  IssueRelationType,
  ScheduleSuggestion,
} from '@876/projects/contracts'

import { request } from './request'

export type CreateIssueRelationParams = {
  targetIssueId: string
  type: IssueRelationType
}

export type CreateIssueDependencyParams = {
  predecessorIssueId: string
  successorIssueId: string
  type?: IssueDependencyType
  lagMinutes?: number
}

export type UpdateIssueDependencyParams = {
  type?: IssueDependencyType
  lagMinutes?: number
}

type DeletedLink = { object: string; id: string; deleted: true }

function issueRoot(issueRef: string) {
  return `/api/issues/${encodeURIComponent(issueRef)}`
}

function jsonRequest(init: RequestInit): RequestInit {
  return {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  }
}

export const issueLinksClient = {
  relations: {
    create(issueRef: string, params: CreateIssueRelationParams) {
      return request<IssueRelation>(
        `${issueRoot(issueRef)}/relations`,
        jsonRequest({ method: 'POST', body: JSON.stringify(params) })
      )
    },
    delete(issueRef: string, relationId: string) {
      return request<DeletedLink>(
        `${issueRoot(issueRef)}/relations/${encodeURIComponent(relationId)}`,
        { method: 'DELETE' }
      )
    },
  },
  dependencies: {
    create(issueRef: string, params: CreateIssueDependencyParams) {
      return request<IssueDependency>(
        `${issueRoot(issueRef)}/dependencies`,
        jsonRequest({ method: 'POST', body: JSON.stringify(params) })
      )
    },
    update(
      issueRef: string,
      dependencyId: string,
      params: UpdateIssueDependencyParams
    ) {
      return request<IssueDependency>(
        `${issueRoot(issueRef)}/dependencies/${encodeURIComponent(dependencyId)}`,
        jsonRequest({ method: 'PATCH', body: JSON.stringify(params) })
      )
    },
    delete(issueRef: string, dependencyId: string) {
      return request<DeletedLink>(
        `${issueRoot(issueRef)}/dependencies/${encodeURIComponent(dependencyId)}`,
        { method: 'DELETE' }
      )
    },
    suggestSchedule(issueRef: string) {
      return request<ScheduleSuggestion>(
        `${issueRoot(issueRef)}/dependencies/schedule-suggestion`,
        { method: 'POST' }
      )
    },
  },
}
