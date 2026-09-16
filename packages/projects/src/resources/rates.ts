import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  rateListSchema,
  rateSchema,
  type CreateRateInput,
  type RequestOptions,
  type UpdateRateInput,
} from '../types'

function collectionRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/rates`
}

function resourcePath(
  organizationId: string,
  projectId: string,
  rateId: string
) {
  return `${collectionRoot(organizationId, projectId)}/${encodeURIComponent(rateId)}`
}

export function createRatesResource(runtime: Runtime) {
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
          path: collectionRoot(organizationId, projectId),
          signal: options.signal,
        },
        rateListSchema
      )
    },
    create(
      organizationId: string,
      projectId: string,
      input: CreateRateInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: collectionRoot(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        rateSchema
      )
    },
    retrieve(
      organizationId: string,
      projectId: string,
      rateId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: resourcePath(organizationId, projectId, rateId),
          signal: options.signal,
        },
        rateSchema
      )
    },
    update(
      organizationId: string,
      projectId: string,
      rateId: string,
      input: UpdateRateInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(organizationId, projectId, rateId),
          body: input,
          signal: options.signal,
        },
        rateSchema
      )
    },
    delete(
      organizationId: string,
      projectId: string,
      rateId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: resourcePath(organizationId, projectId, rateId),
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
