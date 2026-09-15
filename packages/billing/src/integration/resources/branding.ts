import { brandingResourceSchema } from '../../schemas'
import type { Branding, BrandingUpdateParams } from '../../types'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'

function path(organizationId: string) {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/branding`
}
export function createIntegrationBrandingResource(runtime: IntegrationRuntime) {
  return {
    retrieve(organizationId: string) {
      return IntegrationRequest<Branding>(
        runtime,
        { method: 'GET', path: path(organizationId) },
        brandingResourceSchema
      )
    },
    update(organizationId: string, params: BrandingUpdateParams) {
      return IntegrationRequest<Branding>(
        runtime,
        { method: 'PATCH', path: path(organizationId), body: params },
        brandingResourceSchema
      )
    },
  }
}
