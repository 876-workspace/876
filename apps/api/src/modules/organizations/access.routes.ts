import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './access.controller'
import * as docs from './organizations.docs'
import {
  appAssignmentCreateSchema,
  appAssignmentSchema,
  assignmentIdParamsSchema,
  membershipIdParamsSchema,
  orgIdParamsSchema,
  organizationMemberRoleUpdateSchema,
  organizationMemberSchema,
  organizationRoleCreateSchema,
  organizationRoleSchema,
  organizationRoleUpdateSchema,
  permissionCatalogSchema,
  roleIdParamsSchema,
} from './access.schemas'

export function registerOrgAccessRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Org Access',
    prefix: '/organizations',
    security: 'session',
    resolveGuards,
  })

  api.get({
    path: '/permissions/catalog',
    operationId: 'org-access-get_permission_catalog',
    summary: docs.PERMISSION_CATALOG_SUMMARY,
    description: docs.PERMISSION_CATALOG_DESCRIPTION,
    responses: {
      200: {
        description: 'Catalog returned.',
        schema: permissionCatalogSchema,
      },
    },
    handler: controller.getPermissionCatalog,
  })

  api.get({
    path: '/:org_id/roles',
    operationId: 'org-access-list_org_roles',
    summary: docs.LIST_ORG_ROLES_SUMMARY,
    description: docs.LIST_ORG_ROLES_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Roles returned.',
        schema: listObjectSchema(organizationRoleSchema),
      },
    },
    handler: controller.listOrgRoles,
  })

  api.post({
    path: '/:org_id/roles',
    operationId: 'org-access-create_org_role',
    summary: docs.CREATE_ORG_ROLE_SUMMARY,
    description: docs.CREATE_ORG_ROLE_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: organizationRoleCreateSchema },
    responses: {
      201: { description: 'Role created.', schema: organizationRoleSchema },
      409: { description: 'Duplicate name.' },
    },
    handler: controller.createOrgRole,
  })

  api.get({
    path: '/:org_id/roles/:role_id',
    operationId: 'org-access-retrieve_org_role',
    summary: docs.RETRIEVE_ORG_ROLE_SUMMARY,
    description: docs.RETRIEVE_ORG_ROLE_DESCRIPTION,
    request: { params: roleIdParamsSchema },
    responses: {
      200: { description: 'Role returned.', schema: organizationRoleSchema },
      404: { description: 'Role not found.' },
    },
    handler: controller.retrieveOrgRole,
  })

  api.patch({
    path: '/:org_id/roles/:role_id',
    operationId: 'org-access-update_org_role',
    summary: docs.UPDATE_ORG_ROLE_SUMMARY,
    description: docs.UPDATE_ORG_ROLE_DESCRIPTION,
    request: { params: roleIdParamsSchema, body: organizationRoleUpdateSchema },
    responses: {
      200: { description: 'Role updated.', schema: organizationRoleSchema },
      404: { description: 'Role not found.' },
    },
    handler: controller.updateOrgRole,
  })

  api.delete({
    path: '/:org_id/roles/:role_id',
    operationId: 'org-access-delete_org_role',
    summary: docs.DELETE_ORG_ROLE_SUMMARY,
    description: docs.DELETE_ORG_ROLE_DESCRIPTION,
    request: { params: roleIdParamsSchema },
    responses: {
      200: {
        description: 'Role deleted.',
        schema: z.object({
          object: z.literal('organization_role'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: { description: 'Role not found.' },
    },
    handler: controller.deleteOrgRole,
  })

  // Members — /members/me before /:membership_id
  api.get({
    path: '/:org_id/members/me',
    operationId: 'org-access-retrieve_org_member_me',
    summary: docs.RETRIEVE_ORG_MEMBER_ME_SUMMARY,
    description: docs.RETRIEVE_ORG_MEMBER_ME_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Member returned.',
        schema: organizationMemberSchema.extend({
          permissions: z.array(z.string()),
        }),
      },
    },
    handler: controller.retrieveOrgMemberMe,
  })

  api.get({
    path: '/:org_id/members',
    operationId: 'org-access-list_org_members',
    summary: docs.LIST_ORG_MEMBERS_SUMMARY,
    description: docs.LIST_ORG_MEMBERS_DESCRIPTION,
    request: {
      params: orgIdParamsSchema,
      query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }),
    },
    responses: {
      200: {
        description: 'Members returned.',
        schema: listObjectSchema(organizationMemberSchema),
      },
    },
    handler: controller.listOrgMembers,
  })

  api.patch({
    path: '/:org_id/members/:membership_id',
    operationId: 'org-access-update_org_member_role',
    summary: docs.UPDATE_ORG_MEMBER_ROLE_SUMMARY,
    description: docs.UPDATE_ORG_MEMBER_ROLE_DESCRIPTION,
    request: {
      params: membershipIdParamsSchema,
      body: organizationMemberRoleUpdateSchema,
    },
    responses: {
      200: { description: 'Member updated.', schema: organizationMemberSchema },
      404: { description: 'Membership not found.' },
    },
    handler: controller.updateOrgMemberRole,
  })

  api.delete({
    path: '/:org_id/members/:membership_id',
    operationId: 'org-access-delete_org_member',
    summary: 'Remove an organization member',
    request: { params: membershipIdParamsSchema },
    responses: {
      200: {
        description: 'Member removed.',
        schema: z.object({
          object: z.literal('organization_member'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: { description: 'Membership not found.' },
    },
    handler: controller.deleteOrgMember,
  })

  // App assignments
  api.get({
    path: '/:org_id/app-assignments',
    operationId: 'org-access-list_app_assignments',
    summary: docs.LIST_APP_ASSIGNMENTS_SUMMARY,
    description: docs.LIST_APP_ASSIGNMENTS_DESCRIPTION,
    request: {
      params: orgIdParamsSchema,
      query: z.object({
        user_id: z.string().optional(),
        app_id: z.string().optional(),
        include_revoked: z.stringbool().optional().default(false),
      }),
    },
    responses: {
      200: {
        description: 'Assignments returned.',
        schema: listObjectSchema(appAssignmentSchema),
      },
    },
    handler: controller.listAppAssignments,
  })

  api.post({
    path: '/:org_id/app-assignments',
    operationId: 'org-access-create_app_assignment',
    summary: docs.CREATE_APP_ASSIGNMENT_SUMMARY,
    description: docs.CREATE_APP_ASSIGNMENT_DESCRIPTION,
    request: { params: orgIdParamsSchema, body: appAssignmentCreateSchema },
    responses: {
      201: { description: 'Assignment created.', schema: appAssignmentSchema },
      404: { description: 'App or member not found.' },
    },
    handler: controller.createAppAssignment,
  })

  api.delete({
    path: '/:org_id/app-assignments/:assignment_id',
    operationId: 'org-access-revoke_app_assignment',
    summary: docs.REVOKE_APP_ASSIGNMENT_SUMMARY,
    description: docs.REVOKE_APP_ASSIGNMENT_DESCRIPTION,
    request: { params: assignmentIdParamsSchema },
    responses: {
      200: { description: 'Assignment revoked.', schema: appAssignmentSchema },
      404: { description: 'Assignment not found.' },
    },
    handler: controller.revokeAppAssignment,
  })

  return api.router
}
