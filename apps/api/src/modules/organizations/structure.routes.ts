import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './structure.controller'
import * as docs from './organizations.docs'
import {
  contactIdParamsSchema,
  departmentIdParamsSchema,
  employeeIdParamsSchema,
  employeeProfileCreateSchema,
  employeeProfileUpdateSchema,
  employeeProfileSchema,
  locationIdParamsSchema,
  orgContactCreateSchema,
  orgContactSchema,
  orgContactUpdateSchema,
  orgDepartmentCreateSchema,
  orgDepartmentSchema,
  orgDepartmentUpdateSchema,
  orgIdParamsSchema,
  orgLocationCreateSchema,
  orgLocationSchema,
  orgLocationUpdateSchema,
} from './structure.schemas'
import { organizationSchema } from './organizations.schemas'

export function registerOrgStructureRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Org Structure',
    prefix: '/organizations',
    security: 'session',
    resolveGuards,
  })

  // Locations
  api.get({
    path: '/:org_id/locations',
    operationId: 'org-structure-list_org_locations',
    summary: docs.LIST_ORG_LOCATIONS_SUMMARY,
    description: docs.LIST_ORG_LOCATIONS_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Locations returned.',
        schema: listObjectSchema(orgLocationSchema),
      },
    },
    handler: controller.listOrgLocations,
  })
  api.post({
    path: '/:org_id/locations',
    operationId: 'org-structure-create_org_location',
    summary: docs.CREATE_ORG_LOCATION_SUMMARY,
    description: docs.CREATE_ORG_LOCATION_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: orgLocationCreateSchema },
    responses: {
      201: { description: 'Location created.', schema: orgLocationSchema },
      409: { description: 'Duplicate code.' },
    },
    handler: controller.createOrgLocation,
  })
  api.get({
    path: '/:org_id/locations/:location_id',
    operationId: 'org-structure-retrieve_org_location',
    summary: docs.RETRIEVE_ORG_LOCATION_SUMMARY,
    description: docs.RETRIEVE_ORG_LOCATION_DESCRIPTION,
    request: { params: locationIdParamsSchema },
    responses: {
      200: { description: 'Location returned.', schema: orgLocationSchema },
      404: { description: 'Location not found.' },
    },
    handler: controller.retrieveOrgLocation,
  })
  api.patch({
    path: '/:org_id/locations/:location_id',
    operationId: 'org-structure-update_org_location',
    summary: docs.UPDATE_ORG_LOCATION_SUMMARY,
    description: docs.UPDATE_ORG_LOCATION_DESCRIPTION,
    request: { params: locationIdParamsSchema, body: orgLocationUpdateSchema },
    responses: {
      200: { description: 'Location updated.', schema: orgLocationSchema },
      404: { description: 'Location not found.' },
    },
    handler: controller.updateOrgLocation,
  })
  api.delete({
    path: '/:org_id/locations/:location_id',
    operationId: 'org-structure-delete_org_location',
    summary: docs.DELETE_ORG_LOCATION_SUMMARY,
    description: docs.DELETE_ORG_LOCATION_DESCRIPTION,
    request: { params: locationIdParamsSchema },
    responses: {
      200: {
        description: 'Location deleted.',
        schema: orgLocationSchema
          .pick({ object: true, id: true })
          .extend({ deleted: orgLocationSchema.shape.object }),
      },
      404: { description: 'Location not found.' },
    },
    handler: controller.deleteOrgLocation,
  })

  // Contacts
  api.get({
    path: '/:org_id/contacts',
    operationId: 'org-structure-list_org_contacts',
    summary: docs.LIST_ORG_CONTACTS_SUMMARY,
    description: docs.LIST_ORG_CONTACTS_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Contacts returned.',
        schema: listObjectSchema(orgContactSchema),
      },
    },
    handler: controller.listOrgContacts,
  })
  api.post({
    path: '/:org_id/contacts',
    operationId: 'org-structure-create_org_contact',
    summary: docs.CREATE_ORG_CONTACT_SUMMARY,
    description: docs.CREATE_ORG_CONTACT_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: orgContactCreateSchema },
    responses: {
      201: { description: 'Contact created.', schema: orgContactSchema },
    },
    handler: controller.createOrgContact,
  })
  api.get({
    path: '/:org_id/contacts/:contact_id',
    operationId: 'org-structure-retrieve_org_contact',
    summary: docs.RETRIEVE_ORG_CONTACT_SUMMARY,
    description: docs.RETRIEVE_ORG_CONTACT_DESCRIPTION,
    request: { params: contactIdParamsSchema },
    responses: {
      200: { description: 'Contact returned.', schema: orgContactSchema },
      404: { description: 'Contact not found.' },
    },
    handler: controller.retrieveOrgContact,
  })
  api.patch({
    path: '/:org_id/contacts/:contact_id',
    operationId: 'org-structure-update_org_contact',
    summary: docs.UPDATE_ORG_CONTACT_SUMMARY,
    description: docs.UPDATE_ORG_CONTACT_DESCRIPTION,
    request: { params: contactIdParamsSchema, body: orgContactUpdateSchema },
    responses: {
      200: { description: 'Contact updated.', schema: orgContactSchema },
      404: { description: 'Contact not found.' },
    },
    handler: controller.updateOrgContact,
  })
  api.delete({
    path: '/:org_id/contacts/:contact_id',
    operationId: 'org-structure-delete_org_contact',
    summary: docs.DELETE_ORG_CONTACT_SUMMARY,
    description: docs.DELETE_ORG_CONTACT_DESCRIPTION,
    request: { params: contactIdParamsSchema },
    responses: {
      200: {
        description: 'Contact deleted.',
        schema: orgContactSchema
          .pick({ object: true, id: true })
          .extend({ deleted: orgContactSchema.shape.object }),
      },
      404: { description: 'Contact not found.' },
    },
    handler: controller.deleteOrgContact,
  })

  // Departments
  api.get({
    path: '/:org_id/departments',
    operationId: 'org-structure-list_org_departments',
    summary: docs.LIST_ORG_DEPARTMENTS_SUMMARY,
    description: docs.LIST_ORG_DEPARTMENTS_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Departments returned.',
        schema: listObjectSchema(orgDepartmentSchema),
      },
    },
    handler: controller.listOrgDepartments,
  })
  api.post({
    path: '/:org_id/departments',
    operationId: 'org-structure-create_org_department',
    summary: docs.CREATE_ORG_DEPARTMENT_SUMMARY,
    description: docs.CREATE_ORG_DEPARTMENT_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: orgDepartmentCreateSchema },
    responses: {
      201: { description: 'Department created.', schema: orgDepartmentSchema },
    },
    handler: controller.createOrgDepartment,
  })
  api.get({
    path: '/:org_id/departments/:department_id',
    operationId: 'org-structure-retrieve_org_department',
    summary: docs.RETRIEVE_ORG_DEPARTMENT_SUMMARY,
    description: docs.RETRIEVE_ORG_DEPARTMENT_DESCRIPTION,
    request: { params: departmentIdParamsSchema },
    responses: {
      200: { description: 'Department returned.', schema: orgDepartmentSchema },
      404: { description: 'Department not found.' },
    },
    handler: controller.retrieveOrgDepartment,
  })
  api.patch({
    path: '/:org_id/departments/:department_id',
    operationId: 'org-structure-update_org_department',
    summary: docs.UPDATE_ORG_DEPARTMENT_SUMMARY,
    description: docs.UPDATE_ORG_DEPARTMENT_DESCRIPTION,
    request: {
      params: departmentIdParamsSchema,
      body: orgDepartmentUpdateSchema,
    },
    responses: {
      200: { description: 'Department updated.', schema: orgDepartmentSchema },
      404: { description: 'Department not found.' },
    },
    handler: controller.updateOrgDepartment,
  })
  api.delete({
    path: '/:org_id/departments/:department_id',
    operationId: 'org-structure-delete_org_department',
    summary: docs.DELETE_ORG_DEPARTMENT_SUMMARY,
    description: docs.DELETE_ORG_DEPARTMENT_DESCRIPTION,
    request: { params: departmentIdParamsSchema },
    responses: {
      200: {
        description: 'Department deleted.',
        schema: orgDepartmentSchema
          .pick({ object: true, id: true })
          .extend({ deleted: orgDepartmentSchema.shape.object }),
      },
      404: { description: 'Department not found.' },
    },
    handler: controller.deleteOrgDepartment,
  })

  // Employees
  api.get({
    path: '/:org_id/employees',
    operationId: 'org-structure-list_org_employees',
    summary: docs.LIST_ORG_EMPLOYEES_SUMMARY,
    description: docs.LIST_ORG_EMPLOYEES_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Employees returned.',
        schema: listObjectSchema(employeeProfileSchema),
      },
    },
    handler: controller.listOrgEmployees,
  })
  api.post({
    path: '/:org_id/employees',
    operationId: 'org-structure-create_org_employee',
    summary: docs.CREATE_ORG_EMPLOYEE_SUMMARY,
    description: docs.CREATE_ORG_EMPLOYEE_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: employeeProfileCreateSchema },
    responses: {
      201: { description: 'Employee created.', schema: employeeProfileSchema },
      409: { description: 'Duplicate membership.' },
    },
    handler: controller.createOrgEmployee,
  })
  api.get({
    path: '/:org_id/employees/:profile_id',
    operationId: 'org-structure-retrieve_org_employee',
    summary: docs.RETRIEVE_ORG_EMPLOYEE_SUMMARY,
    description: docs.RETRIEVE_ORG_EMPLOYEE_DESCRIPTION,
    request: { params: employeeIdParamsSchema },
    responses: {
      200: { description: 'Employee returned.', schema: employeeProfileSchema },
      404: { description: 'Employee not found.' },
    },
    handler: controller.retrieveOrgEmployee,
  })
  api.patch({
    path: '/:org_id/employees/:profile_id',
    operationId: 'org-structure-update_org_employee',
    summary: docs.UPDATE_ORG_EMPLOYEE_SUMMARY,
    description: docs.UPDATE_ORG_EMPLOYEE_DESCRIPTION,
    request: {
      params: employeeIdParamsSchema,
      body: employeeProfileUpdateSchema,
    },
    responses: {
      200: { description: 'Employee updated.', schema: employeeProfileSchema },
      404: { description: 'Employee not found.' },
    },
    handler: controller.updateOrgEmployee,
  })
  api.delete({
    path: '/:org_id/employees/:profile_id',
    operationId: 'org-structure-delete_org_employee',
    summary: docs.DELETE_ORG_EMPLOYEE_SUMMARY,
    description: docs.DELETE_ORG_EMPLOYEE_DESCRIPTION,
    request: { params: employeeIdParamsSchema },
    responses: {
      200: {
        description: 'Employee deleted.',
        schema: employeeProfileSchema
          .pick({ object: true, id: true })
          .extend({ deleted: employeeProfileSchema.shape.object }),
      },
      404: { description: 'Employee not found.' },
    },
    handler: controller.deleteOrgEmployee,
  })

  // Self-scoped details
  api.get({
    path: '/:org_id/details',
    operationId: 'org-structure-retrieve_my_org_details',
    summary: docs.RETRIEVE_MY_ORG_DETAILS_SUMMARY,
    description: docs.RETRIEVE_MY_ORG_DETAILS_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Organization returned.',
        schema: organizationSchema,
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.retrieveMyOrgDetails,
  })
  api.patch({
    path: '/:org_id/details',
    operationId: 'org-structure-update_my_org_details',
    summary: docs.UPDATE_MY_ORG_DETAILS_SUMMARY,
    description: docs.UPDATE_MY_ORG_DETAILS_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: organizationSchema.partial() },
    responses: {
      200: { description: 'Organization updated.', schema: organizationSchema },
      404: { description: 'Organization not found.' },
    },
    handler: controller.updateMyOrgDetails,
  })

  return api.router
}
