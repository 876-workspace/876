import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  requestFormSubmissionListSchema,
  requestFormSubmissionSchema,
  type SubmitRequestFormInput,
} from '../request-form-types'
import type { RequestOptions } from '../types'

function root(organizationId: string, formId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/request-forms/${encodeURIComponent(formId)}/submissions`
}

export function createRequestFormSubmissionsResource(runtime: Runtime) {
  return {
    create(
      organizationId: string,
      formId: string,
      input: SubmitRequestFormInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, formId),
          body: input,
          signal: options.signal,
        },
        requestFormSubmissionSchema
      )
    },
    list(organizationId: string, formId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId, formId),
          signal: options.signal,
        },
        requestFormSubmissionListSchema
      )
    },
  }
}
