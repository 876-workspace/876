import type { ProjectsOperatorClient } from '@876/projects/operator'

import { request } from './request'

type ProjectsResource = ProjectsOperatorClient['projects']
type IssuesResource = ProjectsOperatorClient['issues']

type CreateProjectInput = Parameters<ProjectsResource['create']>[1]
type CreateIssueInput = Parameters<IssuesResource['create']>[1]

type Project = NonNullable<
  Awaited<ReturnType<ProjectsResource['create']>>['data']
>
type Issue = NonNullable<Awaited<ReturnType<IssuesResource['create']>>['data']>

function organizationRoot(organizationId: string) {
  return `/api/organizations/${encodeURIComponent(organizationId)}`
}

export const projects = {
  create(organizationId: string, params: CreateProjectInput) {
    return request<Project>(`${organizationRoot(organizationId)}/projects`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}

export const issues = {
  create(organizationId: string, params: CreateIssueInput) {
    return request<Issue>(`${organizationRoot(organizationId)}/issues`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
