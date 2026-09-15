import { Request } from '../request'
import type { Runtime } from '../runtime'
import { brandingResourceSchema } from '../schemas'
import type { Branding, BrandingUpdateParams, RequestOptions } from '../types'

export function createBrandingResource(runtime: Runtime) {
  return {
    retrieve(options?: RequestOptions) {
      return Request<Branding>(
        runtime,
        { method: 'GET', path: '/api/v1/branding', signal: options?.signal },
        brandingResourceSchema
      )
    },
    update(params: BrandingUpdateParams, options?: RequestOptions) {
      return Request<Branding>(
        runtime,
        {
          method: 'PATCH',
          path: '/api/v1/branding',
          body: params,
          signal: options?.signal,
        },
        brandingResourceSchema
      )
    },
  }
}
