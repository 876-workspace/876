/**
 * Government directory routes — ministries and their departments.
 *
 * Reads are the `apiKey` tier with `attachPrincipal`, so the tombstone gate can
 * see whether the caller holds platform authority; mutations are `admin`.
 */

import { attachPrincipal } from '@/http/auth'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as docs from './directory.docs'
import {
  departmentIdParamsSchema,
  listDirectoryQuerySchema,
  ministryDeletedSchema,
  ministryDepartmentDeletedSchema,
  ministryIdParamsSchema,
  retrieveDirectoryQuerySchema,
} from './directory.schemas'
import * as controller from './government.controller'
import {
  ministryCreateSchema,
  ministryDepartmentCreateSchema,
  ministryDepartmentSchema,
  ministryDepartmentUpdateSchema,
  ministrySchema,
  ministryUpdateSchema,
} from './government.schemas'

export function registerGovernmentRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Directory',
    prefix: '/directory',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/ministries',
    middleware: [attachPrincipal],
    operationId: 'directory-list_ministries',
    summary: docs.LIST_MINISTRIES_SUMMARY,
    description: docs.LIST_MINISTRIES_DESCRIPTION,
    request: { query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'Ministry list returned.',
        schema: listObjectSchema(ministrySchema),
      },
    },
    handler: controller.listMinistries,
  })

  api.get({
    path: '/ministries/:ministry_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_ministry',
    summary: docs.RETRIEVE_MINISTRY_SUMMARY,
    description: docs.RETRIEVE_MINISTRY_DESCRIPTION,
    request: {
      params: ministryIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: { description: 'Ministry returned.', schema: ministrySchema },
      404: { description: 'Ministry not found.' },
    },
    handler: controller.retrieveMinistry,
  })

  api.post({
    path: '/ministries',
    security: 'admin',
    operationId: 'directory-create_ministry',
    summary: docs.CREATE_MINISTRY_SUMMARY,
    description: docs.CREATE_MINISTRY_DESCRIPTION,
    request: { body: ministryCreateSchema },
    responses: {
      201: { description: 'Ministry created.', schema: ministrySchema },
    },
    handler: controller.createMinistry,
  })

  api.patch({
    path: '/ministries/:ministry_id',
    security: 'admin',
    operationId: 'directory-update_ministry',
    summary: docs.UPDATE_MINISTRY_SUMMARY,
    description: docs.UPDATE_MINISTRY_DESCRIPTION,
    request: { params: ministryIdParamsSchema, body: ministryUpdateSchema },
    responses: {
      200: { description: 'Ministry updated.', schema: ministrySchema },
      404: { description: 'Ministry not found.' },
    },
    handler: controller.updateMinistry,
  })

  api.delete({
    path: '/ministries/:ministry_id',
    security: 'admin',
    operationId: 'directory-delete_ministry',
    summary: docs.DELETE_MINISTRY_SUMMARY,
    description: docs.DELETE_MINISTRY_DESCRIPTION,
    request: { params: ministryIdParamsSchema },
    responses: {
      200: { description: 'Ministry deleted.', schema: ministryDeletedSchema },
      404: { description: 'Ministry not found.' },
    },
    handler: controller.deleteMinistry,
  })

  api.get({
    path: '/ministries/:ministry_id/departments',
    middleware: [attachPrincipal],
    operationId: 'directory-list_ministry_departments',
    summary: docs.LIST_MINISTRY_DEPARTMENTS_SUMMARY,
    description: docs.LIST_MINISTRY_DEPARTMENTS_DESCRIPTION,
    request: {
      params: ministryIdParamsSchema,
      query: listDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Ministry department list returned.',
        schema: listObjectSchema(ministryDepartmentSchema),
      },
      404: { description: 'Ministry not found.' },
    },
    handler: controller.listMinistryDepartments,
  })

  api.get({
    path: '/ministry-departments/:department_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_ministry_department',
    summary: docs.RETRIEVE_MINISTRY_DEPARTMENT_SUMMARY,
    description: docs.RETRIEVE_MINISTRY_DEPARTMENT_DESCRIPTION,
    request: {
      params: departmentIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Ministry department returned.',
        schema: ministryDepartmentSchema,
      },
      404: { description: 'Ministry department not found.' },
    },
    handler: controller.retrieveMinistryDepartment,
  })

  api.post({
    path: '/ministries/:ministry_id/departments',
    security: 'admin',
    operationId: 'directory-create_ministry_department',
    summary: docs.CREATE_MINISTRY_DEPARTMENT_SUMMARY,
    description: docs.CREATE_MINISTRY_DEPARTMENT_DESCRIPTION,
    request: {
      params: ministryIdParamsSchema,
      body: ministryDepartmentCreateSchema,
    },
    responses: {
      201: {
        description: 'Ministry department created.',
        schema: ministryDepartmentSchema,
      },
      404: { description: 'Ministry not found.' },
    },
    handler: controller.createMinistryDepartment,
  })

  api.patch({
    path: '/ministry-departments/:department_id',
    security: 'admin',
    operationId: 'directory-update_ministry_department',
    summary: docs.UPDATE_MINISTRY_DEPARTMENT_SUMMARY,
    description: docs.UPDATE_MINISTRY_DEPARTMENT_DESCRIPTION,
    request: {
      params: departmentIdParamsSchema,
      body: ministryDepartmentUpdateSchema,
    },
    responses: {
      200: {
        description: 'Ministry department updated.',
        schema: ministryDepartmentSchema,
      },
      404: { description: 'Ministry department not found.' },
    },
    handler: controller.updateMinistryDepartment,
  })

  api.delete({
    path: '/ministry-departments/:department_id',
    security: 'admin',
    operationId: 'directory-delete_ministry_department',
    summary: docs.DELETE_MINISTRY_DEPARTMENT_SUMMARY,
    description: docs.DELETE_MINISTRY_DEPARTMENT_DESCRIPTION,
    request: { params: departmentIdParamsSchema },
    responses: {
      200: {
        description: 'Ministry department deleted.',
        schema: ministryDepartmentDeletedSchema,
      },
      404: { description: 'Ministry department not found.' },
    },
    handler: controller.deleteMinistryDepartment,
  })

  return api.router
}
