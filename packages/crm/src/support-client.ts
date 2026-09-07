import 'server-only'

import { crmRequestSchema, requestListSchema } from './request-types'
import { serviceRequest } from './request'
import {
  buildServiceRuntime,
  type ServiceRuntimeOptions,
} from './runtime'
import { requestCategoryListSchema, type RequestOptions } from './types'

export interface SupportRequestCreateParams {
  sourceOrganizationId: string
  sourceOrganizationName: string
  requesterUserId: string
  subject: string
  description?: string | null
  categoryId?: string | null
}

export type CrmSupportClientOptions = ServiceRuntimeOptions

export function create876CrmSupportClient(options: CrmSupportClientOptions) {
  const runtime = buildServiceRuntime(options)

  return {
    categories: {
      list(requestOptions: RequestOptions = {}) {
        return serviceRequest(
          runtime,
          {
            method: 'GET',
            path: '/v1/service/support/categories',
            signal: requestOptions.signal,
          },
          requestCategoryListSchema
        )
      },
    },
    requests: {
      list(sourceOrganizationId: string, requestOptions: RequestOptions = {}) {
        const search = new URLSearchParams({ sourceOrganizationId })
        return serviceRequest(
          runtime,
          {
            method: 'GET',
            path: `/v1/service/support/requests?${search.toString()}`,
            signal: requestOptions.signal,
          },
          requestListSchema
        )
      },
      create(
        params: SupportRequestCreateParams,
        requestOptions: RequestOptions = {}
      ) {
        return serviceRequest(
          runtime,
          {
            method: 'POST',
            path: '/v1/service/support/requests',
            body: params,
            signal: requestOptions.signal,
          },
          crmRequestSchema
        )
      },
    },
  }
}

export type CrmSupportClient = ReturnType<typeof create876CrmSupportClient>
