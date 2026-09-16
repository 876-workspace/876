import {
  integrationRequest,
  type IntegrationRuntime,
} from '../integration-request'
import {
  importJobListSchema,
  importJobRowListSchema,
  importJobSchema,
  type CreateImportJobInput,
  type IntegrationRequestOptions,
} from '../integration-schemas'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/import-jobs`
}

export function createImportJobsResource(runtime: IntegrationRuntime) {
  return {
    create(
      organizationId: string,
      input: CreateImportJobInput,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        importJobSchema
      )
    },
    list(organizationId: string, options: IntegrationRequestOptions = {}) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        importJobListSchema
      )
    },
    retrieve(
      organizationId: string,
      jobId: string,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(jobId)}`,
          signal: options.signal,
        },
        importJobSchema
      )
    },
    listRows(
      organizationId: string,
      jobId: string,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(jobId)}/rows`,
          signal: options.signal,
        },
        importJobRowListSchema
      )
    },
    commit(
      organizationId: string,
      jobId: string,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(jobId)}/commit`,
          signal: options.signal,
        },
        importJobSchema
      )
    },
  }
}
