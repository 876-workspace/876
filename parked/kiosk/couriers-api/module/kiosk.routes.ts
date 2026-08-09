import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import * as c from './kiosk.controller'
import {
  collectBodySchema,
  collectionParamsSchema,
  createPickupChallengeBodySchema,
  deviceParamsSchema,
  deviceSchema,
  enrollBodySchema,
  enrollmentSchema,
  lookupQuerySchema,
  pickupPackageSchema,
  pickupChallengeParamsSchema,
  pickupChallengeSchema,
  tenantParamsSchema,
} from './kiosk.schemas'
export function createKioskRouter(resolveGuards: GuardResolver) {
  const admin = createApiRouter({
    tag: 'Kiosk devices',
    prefix: '/v1/tenants/:tenantId/kiosk-devices',
    resolveGuards,
  })
  admin.get({
    path: '',
    security: 'admin',
    operationId: 'kiosk-devices-list',
    summary: 'List kiosk devices',
    request: { params: tenantParamsSchema },
    responses: {
      200: {
        description: 'Devices returned.',
        schema: successEnvelopeSchema(listObjectSchema(deviceSchema)),
      },
    },
    handler: c.listDevices,
  })
  admin.post({
    path: '',
    security: 'admin',
    operationId: 'kiosk-devices-enroll',
    summary: 'Enroll a kiosk device',
    request: { params: tenantParamsSchema, body: enrollBodySchema },
    responses: {
      201: {
        description: 'Credential returned exactly once.',
        schema: successEnvelopeSchema(enrollmentSchema),
      },
      404: { description: 'Branch not found.', schema: errorEnvelopeSchema },
    },
    handler: c.enroll,
  })
  admin.patch({
    path: '/:id/revoke',
    security: 'admin',
    operationId: 'kiosk-devices-revoke',
    summary: 'Revoke a kiosk device',
    request: { params: deviceParamsSchema },
    responses: {
      200: {
        description: 'Device revoked.',
        schema: successEnvelopeSchema(deviceSchema),
      },
      404: { description: 'Device not found.', schema: errorEnvelopeSchema },
    },
    handler: c.revoke,
  })
  const challenges = createApiRouter({
    tag: 'Kiosk pickup',
    prefix: '/v1/tenants/:tenantId/packages',
    resolveGuards,
  })
  challenges.post({
    path: '/:packageId/pickup-challenges',
    security: 'admin',
    operationId: 'kiosk-pickup-challenges-create',
    summary: 'Create a one-time pickup code',
    description:
      'Returns the code exactly once. Deliver it to the customer through an approved channel.',
    request: {
      params: pickupChallengeParamsSchema,
      body: createPickupChallengeBodySchema,
    },
    responses: {
      201: {
        description: 'One-time code returned exactly once.',
        schema: successEnvelopeSchema(pickupChallengeSchema),
      },
      404: { description: 'Package not found.', schema: errorEnvelopeSchema },
    },
    handler: c.createPickupChallenge,
  })
  const kiosk = createApiRouter({
    tag: 'Kiosk pickup',
    prefix: '/v1/kiosk',
    resolveGuards,
  })
  kiosk.get({
    path: '/packages/lookup',
    security: 'kioskDevice',
    operationId: 'kiosk-packages-lookup',
    summary: 'Look up waiting packages with a mailbox and pickup code',
    request: { query: lookupQuerySchema },
    responses: {
      200: {
        description: 'Waiting packages.',
        schema: successEnvelopeSchema(listObjectSchema(pickupPackageSchema)),
      },
      401: {
        description: 'Invalid device credential.',
        schema: errorEnvelopeSchema,
      },
      403: { description: 'Invalid pickup code.', schema: errorEnvelopeSchema },
    },
    handler: c.lookup,
  })
  kiosk.post({
    path: '/packages/:id/collect',
    security: 'kioskDevice',
    operationId: 'kiosk-packages-collect',
    summary: 'Collect a package with a one-time pickup code',
    request: { params: collectionParamsSchema, body: collectBodySchema },
    responses: {
      200: {
        description: 'Package collected.',
        schema: successEnvelopeSchema(pickupPackageSchema),
      },
      401: {
        description: 'Invalid device credential.',
        schema: errorEnvelopeSchema,
      },
      403: {
        description: 'Invalid pickup code or branch.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: c.collect,
  })
  return [admin.router, challenges.router, kiosk.router]
}
