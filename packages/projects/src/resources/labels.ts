import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  labelListSchema,
  labelSchema,
  type CreateLabelInput,
  type RequestOptions,
  type UpdateLabelInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/labels`
}

export function createLabelsResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        labelListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateLabelInput,
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
        labelSchema
      )
    },
    retrieve(
      organizationId: string,
      labelId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(labelId)}`,
          signal: options.signal,
        },
        labelSchema
      )
    },
    update(
      organizationId: string,
      labelId: string,
      input: UpdateLabelInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(labelId)}`,
          body: input,
          signal: options.signal,
        },
        labelSchema
      )
    },
    delete(
      organizationId: string,
      labelId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(labelId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
