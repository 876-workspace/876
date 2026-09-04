import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  customFieldValueListSchema,
  customFieldValueSchema,
  deletedSchema,
  type RequestOptions,
  type SetCustomFieldValueInput,
} from '../types'

function root(organizationId: string, issueRef: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/issues/${encodeURIComponent(issueRef)}/custom-field-values`
}

export function createCustomFieldValuesResource(runtime: Runtime) {
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
        customFieldValueListSchema
      )
    },
    set(
      organizationId: string,
      issueRef: string,
      input: SetCustomFieldValueInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PUT',
          path: root(organizationId, issueRef),
          body: input,
          signal: options.signal,
        },
        customFieldValueSchema.nullable()
      )
    },
    delete(
      organizationId: string,
      issueRef: string,
      valueId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, issueRef)}/${encodeURIComponent(valueId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
