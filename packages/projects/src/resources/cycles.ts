import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  cycleListSchema,
  cycleSchema,
  deletedSchema,
  type AssignCycleIssuesInput,
  type CreateCycleInput,
  type ListCyclesQuery,
  type RequestOptions,
  type UpdateCycleInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/cycles`
}

function toQueryString(params?: ListCyclesQuery): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.projectId) search.set('projectId', params.projectId)
  if (params.status) search.set('status', params.status)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createCyclesResource(runtime: Runtime) {
  return {
    list(organizationId: string, query: ListCyclesQuery & RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(query)}`,
          signal: query.signal,
        },
        cycleListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateCycleInput,
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
        cycleSchema
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
        cycleSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateCycleInput,
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
        cycleSchema
      )
    },
    delete(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    assignIssues(
      organizationId: string,
      id: string,
      input: AssignCycleIssuesInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/issues`,
          body: input,
          signal: options.signal,
        },
        cycleSchema
      )
    },
    unassignIssue(
      organizationId: string,
      id: string,
      issueId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/issues/${encodeURIComponent(issueId)}`,
          signal: options.signal,
        },
        cycleSchema
      )
    },
  }
}
