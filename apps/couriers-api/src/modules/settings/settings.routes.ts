import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import * as c from './settings.controller'
import {
  moduleParamsSchema,
  moduleStateSchema,
  tenantParamsSchema,
  toggleBodySchema,
} from './settings.schemas'
export function createSettingsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Settings',
    prefix: '/v1/tenants/:tenantId/modules',
    resolveGuards,
  })
  api.get({
    path: '',
    security: 'admin',
    operationId: 'modules-list',
    summary: 'List tenant module states',
    request: { params: tenantParamsSchema },
    responses: {
      200: {
        description: 'Module states returned.',
        schema: successEnvelopeSchema(listObjectSchema(moduleStateSchema)),
      },
    },
    handler: c.list,
  })
  api.patch({
    path: '/:module',
    security: 'admin',
    operationId: 'modules-toggle',
    summary: 'Enable or disable an optional module',
    request: { params: moduleParamsSchema, body: toggleBodySchema },
    responses: {
      200: {
        description: 'Module state updated.',
        schema: successEnvelopeSchema(moduleStateSchema),
      },
      404: { description: 'Module not found.', schema: errorEnvelopeSchema },
      409: { description: 'Required module.', schema: errorEnvelopeSchema },
    },
    handler: c.toggle,
  })
  return api.router
}
