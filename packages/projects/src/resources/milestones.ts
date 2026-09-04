import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  milestoneListSchema,
  milestoneSchema,
  type CreateMilestoneInput,
  type MilestoneListParams,
  type RequestOptions,
  type UpdateMilestoneInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/milestones`
}

function toQueryString(
  projectId: string,
  options: Omit<MilestoneListParams, 'projectId'>
) {
  const search = new URLSearchParams({ projectId })
  if (options.status) search.set('status', options.status)
  return `?${search.toString()}`
}

export function createMilestonesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      options: Omit<MilestoneListParams, 'projectId'> & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(projectId, options)}`,
          signal: options.signal,
        },
        milestoneListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateMilestoneInput,
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
        milestoneSchema
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
        milestoneSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateMilestoneInput,
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
        milestoneSchema
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
  }
}
