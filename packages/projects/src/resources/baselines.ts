import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  baselineComparisonSchema,
  baselineDetailSchema,
  baselineListSchema,
  deletedSchema,
  type CreateBaselineInput,
  type RequestOptions,
} from '../types'

function projectRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/baselines`
}

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/baselines`
}

export function createBaselinesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: projectRoot(organizationId, projectId),
          signal: options.signal,
        },
        baselineListSchema
      )
    },
    create(
      organizationId: string,
      projectId: string,
      input: CreateBaselineInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: projectRoot(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        baselineDetailSchema
      )
    },
    retrieve(
      organizationId: string,
      baselineId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(baselineId)}`,
          signal: options.signal,
        },
        baselineDetailSchema
      )
    },
    delete(
      organizationId: string,
      baselineId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(baselineId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    comparison(
      organizationId: string,
      projectId: string,
      baselineId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${projectRoot(organizationId, projectId)}/${encodeURIComponent(baselineId)}/comparison`,
          signal: options.signal,
        },
        baselineComparisonSchema
      )
    },
  }
}
