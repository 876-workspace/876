import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  issueDependencySchema,
  issueDependencyViewSchema,
  scheduleSuggestionSchema,
  type CreateIssueDependencyInput,
  type RequestOptions,
  type UpdateIssueDependencyInput,
} from '../types'

function root(organizationId: string, issueRef: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/issues/${encodeURIComponent(issueRef)}/dependencies`
}

export function createIssueDependenciesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      issueRef: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId, issueRef),
          signal: options.signal,
        },
        issueDependencyViewSchema
      )
    },
    create(
      organizationId: string,
      issueRef: string,
      input: CreateIssueDependencyInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, issueRef),
          body: input,
          signal: options.signal,
        },
        issueDependencySchema
      )
    },
    update(
      organizationId: string,
      issueRef: string,
      id: string,
      input: UpdateIssueDependencyInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, issueRef)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        issueDependencySchema
      )
    },
    delete(
      organizationId: string,
      issueRef: string,
      id: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, issueRef)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    suggestSchedule(
      organizationId: string,
      issueRef: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId, issueRef)}/schedule-suggestion`,
          body: {},
          signal: options.signal,
        },
        scheduleSuggestionSchema
      )
    },
  }
}
