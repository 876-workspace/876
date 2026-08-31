import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './provisioning-setup-policy.controller'
import {
  provisioningSetupPolicyParamsSchema,
  provisioningSetupPolicyReplaceSchema,
  provisioningSetupPolicyResponseSchema,
} from './provisioning-setup-policy.schemas'

export function createProvisioningSetupPolicyRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Provisioning',
    prefix: '/provisioning',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '/setups/:setup_key/policy',
    operationId: 'provisioning-retrieve_setup_policy',
    summary: 'Retrieve provisioning setup policy',
    description:
      'Returns match conditions and application/service entitlements independently of the manifest-v1 finance configuration.',
    request: { params: provisioningSetupPolicyParamsSchema },
    responses: {
      200: {
        description: 'Setup policy returned.',
        schema: provisioningSetupPolicyResponseSchema,
      },
      404: { description: 'Setup not found.' },
    },
    handler: controller.retrieveSetupPolicy,
  })

  api.put({
    path: '/setups/:setup_key/policy',
    operationId: 'provisioning-replace_setup_policy',
    summary: 'Replace provisioning setup policy',
    description:
      'Atomically replaces match conditions and explicit application/service entitlement declarations for one setup.',
    request: {
      params: provisioningSetupPolicyParamsSchema,
      body: provisioningSetupPolicyReplaceSchema,
    },
    responses: {
      200: {
        description: 'Setup policy replaced.',
        schema: provisioningSetupPolicyResponseSchema,
      },
      400: { description: 'Policy contains an invalid entitlement target.' },
      404: { description: 'Setup not found.' },
    },
    handler: controller.replaceSetupPolicy,
  })

  return api.router
}
