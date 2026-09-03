import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  tenantSchema,
  type RequestOptions,
} from '../types'

export function createTenantsResource(runtime: Runtime) {
  return {
    ensure(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'POST',
          path: '/v1/tenants/ensure',
          body: { organizationId },
          signal: options.signal,
        },
        tenantSchema
      )
    },
    retrieve(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants/${encodeURIComponent(organizationId)}`,
          signal: options.signal,
        },
        tenantSchema
      )
    },
  }
}
