/**
 * Education directory routes — universities, their campuses, and secondary
 * schools.
 *
 * Note the paths: secondary schools are served under `/schools`, not
 * `/secondary-schools`. That is the URL clients already call, and a URL is a
 * contract (`.claude/rules/naming.md`) — only the `object` discriminator and the
 * error codes carry the fuller `secondary_school` name.
 */

import { attachPrincipal } from '@/http/auth'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as docs from './directory.docs'
import {
  campusIdParamsSchema,
  listDirectoryQuerySchema,
  retrieveDirectoryQuerySchema,
  schoolIdParamsSchema,
  secondarySchoolDeletedSchema,
  universityCampusDeletedSchema,
  universityDeletedSchema,
  universityIdParamsSchema,
} from './directory.schemas'
import * as controller from './education.controller'
import {
  secondarySchoolCreateSchema,
  secondarySchoolSchema,
  secondarySchoolUpdateSchema,
  universityCampusCreateSchema,
  universityCampusSchema,
  universityCampusUpdateSchema,
  universityCreateSchema,
  universitySchema,
  universityUpdateSchema,
} from './education.schemas'

export function registerEducationRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Directory',
    prefix: '/directory',
    security: 'apiKey',
    resolveGuards,
  })

  // --- Universities ---

  api.get({
    path: '/universities',
    middleware: [attachPrincipal],
    operationId: 'directory-list_universities',
    summary: docs.LIST_UNIVERSITIES_SUMMARY,
    description: docs.LIST_UNIVERSITIES_DESCRIPTION,
    request: { query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'University list returned.',
        schema: listObjectSchema(universitySchema),
      },
    },
    handler: controller.listUniversities,
  })

  api.get({
    path: '/universities/:university_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_university',
    summary: docs.RETRIEVE_UNIVERSITY_SUMMARY,
    description: docs.RETRIEVE_UNIVERSITY_DESCRIPTION,
    request: {
      params: universityIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: { description: 'University returned.', schema: universitySchema },
      404: { description: 'University not found.' },
    },
    handler: controller.retrieveUniversity,
  })

  api.post({
    path: '/universities',
    security: 'admin',
    operationId: 'directory-create_university',
    summary: docs.CREATE_UNIVERSITY_SUMMARY,
    description: docs.CREATE_UNIVERSITY_DESCRIPTION,
    request: { body: universityCreateSchema },
    responses: {
      201: { description: 'University created.', schema: universitySchema },
    },
    handler: controller.createUniversity,
  })

  api.patch({
    path: '/universities/:university_id',
    security: 'admin',
    operationId: 'directory-update_university',
    summary: docs.UPDATE_UNIVERSITY_SUMMARY,
    description: docs.UPDATE_UNIVERSITY_DESCRIPTION,
    request: { params: universityIdParamsSchema, body: universityUpdateSchema },
    responses: {
      200: { description: 'University updated.', schema: universitySchema },
      404: { description: 'University not found.' },
    },
    handler: controller.updateUniversity,
  })

  api.delete({
    path: '/universities/:university_id',
    security: 'admin',
    operationId: 'directory-delete_university',
    summary: docs.DELETE_UNIVERSITY_SUMMARY,
    description: docs.DELETE_UNIVERSITY_DESCRIPTION,
    request: { params: universityIdParamsSchema },
    responses: {
      200: {
        description: 'University deleted.',
        schema: universityDeletedSchema,
      },
      404: { description: 'University not found.' },
    },
    handler: controller.deleteUniversity,
  })

  // --- University campuses ---

  api.get({
    path: '/universities/:university_id/campuses',
    middleware: [attachPrincipal],
    operationId: 'directory-list_university_campuses',
    summary: docs.LIST_UNIVERSITY_CAMPUSES_SUMMARY,
    description: docs.LIST_UNIVERSITY_CAMPUSES_DESCRIPTION,
    request: {
      params: universityIdParamsSchema,
      query: listDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'University campus list returned.',
        schema: listObjectSchema(universityCampusSchema),
      },
      404: { description: 'University not found.' },
    },
    handler: controller.listUniversityCampuses,
  })

  api.get({
    path: '/university-campuses/:campus_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_university_campus',
    summary: docs.RETRIEVE_UNIVERSITY_CAMPUS_SUMMARY,
    description: docs.RETRIEVE_UNIVERSITY_CAMPUS_DESCRIPTION,
    request: {
      params: campusIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'University campus returned.',
        schema: universityCampusSchema,
      },
      404: { description: 'University campus not found.' },
    },
    handler: controller.retrieveUniversityCampus,
  })

  api.post({
    path: '/universities/:university_id/campuses',
    security: 'admin',
    operationId: 'directory-create_university_campus',
    summary: docs.CREATE_UNIVERSITY_CAMPUS_SUMMARY,
    description: docs.CREATE_UNIVERSITY_CAMPUS_DESCRIPTION,
    request: {
      params: universityIdParamsSchema,
      body: universityCampusCreateSchema,
    },
    responses: {
      201: {
        description: 'University campus created.',
        schema: universityCampusSchema,
      },
      404: { description: 'University not found.' },
    },
    handler: controller.createUniversityCampus,
  })

  api.patch({
    path: '/university-campuses/:campus_id',
    security: 'admin',
    operationId: 'directory-update_university_campus',
    summary: docs.UPDATE_UNIVERSITY_CAMPUS_SUMMARY,
    description: docs.UPDATE_UNIVERSITY_CAMPUS_DESCRIPTION,
    request: {
      params: campusIdParamsSchema,
      body: universityCampusUpdateSchema,
    },
    responses: {
      200: {
        description: 'University campus updated.',
        schema: universityCampusSchema,
      },
      404: { description: 'University campus not found.' },
    },
    handler: controller.updateUniversityCampus,
  })

  api.delete({
    path: '/university-campuses/:campus_id',
    security: 'admin',
    operationId: 'directory-delete_university_campus',
    summary: docs.DELETE_UNIVERSITY_CAMPUS_SUMMARY,
    description: docs.DELETE_UNIVERSITY_CAMPUS_DESCRIPTION,
    request: { params: campusIdParamsSchema },
    responses: {
      200: {
        description: 'University campus deleted.',
        schema: universityCampusDeletedSchema,
      },
      404: { description: 'University campus not found.' },
    },
    handler: controller.deleteUniversityCampus,
  })

  // --- Secondary schools ---

  api.get({
    path: '/schools',
    middleware: [attachPrincipal],
    operationId: 'directory-list_secondary_schools',
    summary: docs.LIST_SCHOOLS_SUMMARY,
    description: docs.LIST_SCHOOLS_DESCRIPTION,
    request: { query: listDirectoryQuerySchema },
    responses: {
      200: {
        description: 'Secondary school list returned.',
        schema: listObjectSchema(secondarySchoolSchema),
      },
    },
    handler: controller.listSecondarySchools,
  })

  api.get({
    path: '/schools/:school_id',
    middleware: [attachPrincipal],
    operationId: 'directory-retrieve_secondary_school',
    summary: docs.RETRIEVE_SCHOOL_SUMMARY,
    description: docs.RETRIEVE_SCHOOL_DESCRIPTION,
    request: {
      params: schoolIdParamsSchema,
      query: retrieveDirectoryQuerySchema,
    },
    responses: {
      200: {
        description: 'Secondary school returned.',
        schema: secondarySchoolSchema,
      },
      404: { description: 'Secondary school not found.' },
    },
    handler: controller.retrieveSecondarySchool,
  })

  api.post({
    path: '/schools',
    security: 'admin',
    operationId: 'directory-create_secondary_school',
    summary: docs.CREATE_SCHOOL_SUMMARY,
    description: docs.CREATE_SCHOOL_DESCRIPTION,
    request: { body: secondarySchoolCreateSchema },
    responses: {
      201: {
        description: 'Secondary school created.',
        schema: secondarySchoolSchema,
      },
    },
    handler: controller.createSecondarySchool,
  })

  api.patch({
    path: '/schools/:school_id',
    security: 'admin',
    operationId: 'directory-update_secondary_school',
    summary: docs.UPDATE_SCHOOL_SUMMARY,
    description: docs.UPDATE_SCHOOL_DESCRIPTION,
    request: {
      params: schoolIdParamsSchema,
      body: secondarySchoolUpdateSchema,
    },
    responses: {
      200: {
        description: 'Secondary school updated.',
        schema: secondarySchoolSchema,
      },
      404: { description: 'Secondary school not found.' },
    },
    handler: controller.updateSecondarySchool,
  })

  api.delete({
    path: '/schools/:school_id',
    security: 'admin',
    operationId: 'directory-delete_secondary_school',
    summary: docs.DELETE_SCHOOL_SUMMARY,
    description: docs.DELETE_SCHOOL_DESCRIPTION,
    request: { params: schoolIdParamsSchema },
    responses: {
      200: {
        description: 'Secondary school deleted.',
        schema: secondarySchoolDeletedSchema,
      },
      404: { description: 'Secondary school not found.' },
    },
    handler: controller.deleteSecondarySchool,
  })

  return api.router
}
