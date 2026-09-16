import {
  integrationRequest,
  type IntegrationRuntime,
} from '../integration-request'
import {
  createdIntegrationClientSchema,
  integrationClientSchema,
  type CreateIntegrationClientInput,
  type IntegrationRequestOptions,
} from '../integration-schemas'

export function createIntegrationClientsResource(runtime: IntegrationRuntime) {
  return {
    create(
      input: CreateIntegrationClientInput,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'POST',
          path: '/internal/integration-clients',
          body: input,
          signal: options.signal,
        },
        createdIntegrationClientSchema
      )
    },
    list(organizationId: string, options: IntegrationRequestOptions = {}) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'GET',
          path: `/internal/integration-clients?organizationId=${encodeURIComponent(organizationId)}`,
          signal: options.signal,
        },
        integrationClientSchema.array()
      )
    },
    revoke(
      clientId: string,
      organizationId: string,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'POST',
          path: `/internal/integration-clients/${encodeURIComponent(clientId)}/revoke?organizationId=${encodeURIComponent(organizationId)}`,
          signal: options.signal,
        },
        integrationClientSchema
      )
    },
  }
}
