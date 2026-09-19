import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  developmentLinkListSchema,
  developmentLinkSchema,
  type CreateDevelopmentLinkInput,
  type RequestOptions,
  type UpdateDevelopmentLinkInput,
} from '../types'

function issueRoot(organizationId: string, issueRef: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/issues/${encodeURIComponent(issueRef)}/development-links`
}
function root(organizationId: string, id: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/development-links/${encodeURIComponent(id)}`
}
export function createDevelopmentLinksResource(runtime: Runtime) {
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
          path: issueRoot(organizationId, issueRef),
          signal: options.signal,
        },
        developmentLinkListSchema
      )
    },
    create(
      organizationId: string,
      issueRef: string,
      input: CreateDevelopmentLinkInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: issueRoot(organizationId, issueRef),
          body: input,
          signal: options.signal,
        },
        developmentLinkSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateDevelopmentLinkInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: root(organizationId, id),
          body: input,
          signal: options.signal,
        },
        developmentLinkSchema
      )
    },
    delete(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: root(organizationId, id),
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
