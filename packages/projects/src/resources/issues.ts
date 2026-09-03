import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  issueEventListSchema,
  issueListSchema,
  issueSchema,
  type CreateIssueInput,
  type ListIssuesQuery,
  type RequestOptions,
  type UpdateIssueInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/issues`
}

function toQueryString(params?: ListIssuesQuery): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.project) search.set('project', params.project)
  if (params.status) {
    const val = Array.isArray(params.status)
      ? params.status.join(',')
      : params.status
    search.set('status', val)
  }
  if (params.priority) {
    const val = Array.isArray(params.priority)
      ? params.priority.join(',')
      : params.priority
    search.set('priority', val)
  }
  if (params.assignee) search.set('assignee', params.assignee)
  if (params.label) {
    const val = Array.isArray(params.label)
      ? params.label.join(',')
      : params.label
    search.set('label', val)
  }
  if (params.parent) search.set('parent', params.parent)
  if (params.q) search.set('q', params.q)
  if (typeof params.updatedSince === 'number') {
    search.set('updated_since', String(params.updatedSince))
  }
  if (typeof params.includeDeleted === 'boolean') {
    search.set('include_deleted', String(params.includeDeleted))
  }
  if (params.order) search.set('order', params.order)
  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  if (params.endingBefore) search.set('ending_before', params.endingBefore)

  const qs = search.toString().replace(/%2C/g, ',')
  return qs ? `?${qs}` : ''
}

export function createIssuesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListIssuesQuery & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(query)}`,
          signal: query.signal,
        },
        issueListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateIssueInput,
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
        issueSchema
      )
    },
    retrieve(
      organizationId: string,
      issueRef: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(issueRef)}`,
          signal: options.signal,
        },
        issueSchema
      )
    },
    update(
      organizationId: string,
      issueRef: string,
      input: UpdateIssueInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(issueRef)}`,
          body: input,
          signal: options.signal,
        },
        issueSchema
      )
    },
    delete(
      organizationId: string,
      issueRef: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(issueRef)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    events: {
      list(
        organizationId: string,
        issueRef: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'GET',
            path: `${root(organizationId)}/${encodeURIComponent(issueRef)}/events`,
            signal: options.signal,
          },
          issueEventListSchema
        )
      },
    },
  }
}
