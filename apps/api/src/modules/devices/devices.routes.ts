import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'
import {
  authAttemptSchema,
  listAuthAttemptsQuerySchema,
} from '@/modules/auth-attempts'

import * as controller from './devices.controller'
import * as docs from './devices.docs'
import {
  deviceIdParamsSchema,
  deviceSchema,
  deviceUserSchema,
  listDevicesQuerySchema,
  updateDeviceBodySchema,
  userIdParamsSchema,
} from './devices.schemas'

/** The device registry is admin-only, as every route is in the FastAPI router. */
export function createDevicesRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Devices',
    prefix: '/devices',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '',
    operationId: 'devices-list_devices',
    summary: docs.LIST_DEVICES_SUMMARY,
    description: docs.LIST_DEVICES_DESCRIPTION,
    request: { query: listDevicesQuerySchema },
    responses: {
      200: {
        description: 'Devices returned.',
        schema: listObjectSchema(deviceSchema),
      },
    },
    handler: controller.listDevices,
  })

  // The two sub-resources are declared before '/:device_id' so Express cannot
  // match 'attempts' or 'users' as an id.
  api.get({
    path: '/:device_id/attempts',
    operationId: 'devices-list_device_attempts',
    summary: docs.LIST_DEVICE_ATTEMPTS_SUMMARY,
    description: docs.LIST_DEVICE_ATTEMPTS_DESCRIPTION,
    request: {
      params: deviceIdParamsSchema,
      query: listAuthAttemptsQuerySchema,
    },
    responses: {
      200: {
        description: 'Attempts returned.',
        schema: listObjectSchema(authAttemptSchema),
      },
      404: { description: 'Device not found.' },
    },
    handler: controller.listDeviceAttempts,
  })

  api.get({
    path: '/:device_id/users',
    operationId: 'devices-list_device_users',
    summary: docs.LIST_DEVICE_USERS_SUMMARY,
    description: docs.LIST_DEVICE_USERS_DESCRIPTION,
    request: { params: deviceIdParamsSchema },
    responses: {
      200: {
        description: 'Device users returned.',
        schema: listObjectSchema(deviceUserSchema),
      },
      404: { description: 'Device not found.' },
    },
    handler: controller.listDeviceUsers,
  })

  api.get({
    path: '/:device_id',
    operationId: 'devices-retrieve_device',
    summary: docs.RETRIEVE_DEVICE_SUMMARY,
    description: docs.RETRIEVE_DEVICE_DESCRIPTION,
    request: { params: deviceIdParamsSchema },
    responses: {
      200: { description: 'Device returned.', schema: deviceSchema },
      404: { description: 'Device not found.' },
    },
    handler: controller.retrieveDevice,
  })

  api.post({
    path: '/:device_id',
    operationId: 'devices-update_device',
    summary: docs.UPDATE_DEVICE_SUMMARY,
    description: docs.UPDATE_DEVICE_DESCRIPTION,
    request: { params: deviceIdParamsSchema, body: updateDeviceBodySchema },
    responses: {
      200: { description: 'Device updated.', schema: deviceSchema },
      404: { description: 'Device not found.' },
    },
    handler: controller.updateDevice,
  })

  const users = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'admin',
    resolveGuards,
  })

  users.get({
    path: '/:user_id/devices',
    operationId: 'users-list_user_devices',
    summary: 'List devices for a user',
    request: { params: userIdParamsSchema, query: listDevicesQuerySchema },
    responses: {
      200: {
        description: 'Devices returned.',
        schema: listObjectSchema(deviceSchema),
      },
    },
    handler: controller.listUserDevices,
  })

  // Both routers register absolute paths; nesting only returns one router.
  api.router.use(users.router)
  return api.router
}
