import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  projectListSchema,
  projectMemberListSchema,
  projectMemberSchema,
  projectSchema,
  type AddProjectMemberInput,
  type CreateProjectInput,
  type ListProjectsQuery,
  type RequestOptions,
  type UpdateProjectInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects`
}

function toQueryString(params?: ListProjectsQuery): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.lead) search.set('lead', params.lead)
  if (params.q) search.set('q', params.q)
  if (typeof params.includeArchived === 'boolean') {
    search.set('include_archived', String(params.includeArchived))
  }
  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  if (params.endingBefore) search.set('ending_before', params.endingBefore)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createProjectsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListProjectsQuery & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(query)}`,
          signal: query.signal,
        },
        projectListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateProjectInput,
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
        projectSchema
      )
    },
    retrieve(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(projectId)}`,
          signal: options.signal,
        },
        projectSchema
      )
    },
    update(
      organizationId: string,
      projectId: string,
      input: UpdateProjectInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(projectId)}`,
          body: input,
          signal: options.signal,
        },
        projectSchema
      )
    },
    delete(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(projectId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    members: {
      list(
        organizationId: string,
        projectId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'GET',
            path: `${root(organizationId)}/${encodeURIComponent(projectId)}/members`,
            signal: options.signal,
          },
          projectMemberListSchema
        )
      },
      create(
        organizationId: string,
        projectId: string,
        input: AddProjectMemberInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'POST',
            path: `${root(organizationId)}/${encodeURIComponent(projectId)}/members`,
            body: input,
            signal: options.signal,
          },
          projectMemberSchema
        )
      },
      delete(
        organizationId: string,
        projectId: string,
        userId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'DELETE',
            path: `${root(organizationId)}/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
            signal: options.signal,
          },
          deletedSchema
        )
      },
    },
  }
}
