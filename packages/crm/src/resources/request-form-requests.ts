import { request } from '../request'
import type { Runtime } from '../runtime'
import type { ListFormCustomerRequestsQuery } from '../request-form-types'
import { requestListSchema, type RequestOptions } from '../types'

function root(organizationId: string, formId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/request-forms/${encodeURIComponent(formId)}/requests`
}

export function createRequestFormRequestsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      formId: string,
      options: ListFormCustomerRequestsQuery & RequestOptions
    ) {
      const search = new URLSearchParams()
      if (options.customerOrganizationId)
        search.set('customerOrganizationId', options.customerOrganizationId)
      if (options.customerUserId)
        search.set('customerUserId', options.customerUserId)

      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, formId)}?${search.toString()}`,
          signal: options.signal,
        },
        requestListSchema
      )
    },
  }
}
