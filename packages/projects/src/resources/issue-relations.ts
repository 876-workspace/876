import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  issueRelationListSchema,
  issueRelationSchema,
  type CreateIssueRelationInput,
  type RequestOptions,
} from '../types'

function root(organizationId: string, issueRef: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/issues/${encodeURIComponent(issueRef)}/relations`
}

export function createIssueRelationsResource(runtime: Runtime) {
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
        issueRelationListSchema
      )
    },
    create(
      organizationId: string,
      issueRef: string,
      input: CreateIssueRelationInput,
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
        issueRelationSchema
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
  }
}
