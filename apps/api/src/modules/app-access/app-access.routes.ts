import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './app-access.controller'
import * as docs from './app-access.docs'
import {
  appIdParamsSchema,
  appMembershipDeleteSchema,
  appMembershipSchema,
  appPermissionIdParamsSchema,
  appPermissionSchema,
  appRoleIdParamsSchema,
  appRoleSchema,
  assignmentIdParamsSchema,
  createAppMembershipBodySchema,
  createAppPermissionBodySchema,
  createAppRoleBodySchema,
  listAppMembershipsQuerySchema,
  memberAppMembershipsParamsSchema,
  orgAppParamsSchema,
  orgAppRoleIdParamsSchema,
  orgIdParamsSchema,
  syncAppPermissionsBodySchema,
  updateAppMembershipBodySchema,
  updateAppPermissionBodySchema,
  updateAppRoleBodySchema,
} from './app-access.schemas'

const appPermissionDeleteSchema = z.object({
  object: z.literal('app_permission'),
  id: z.string(),
  deleted: z.literal(true),
})
const appRoleDeleteSchema = z.object({
  object: z.literal('app_role'),
  id: z.string(),
  deleted: z.literal(true),
})

export function registerAppAccessRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'App Access', resolveGuards })

  api.get({
    path: '/apps/:app_id/permissions',
    operationId: 'app-access-list_app_permissions',
    summary: docs.LIST_APP_PERMISSIONS_SUMMARY,
    description: docs.APP_PERMISSION_DESCRIPTION,
    security: 'admin',
    request: { params: appIdParamsSchema },
    responses: { 200: { description: 'Permission catalog returned.', schema: listObjectSchema(appPermissionSchema) } },
    handler: controller.listAppPermissions,
  })
  api.post({
    path: '/apps/:app_id/permissions',
    operationId: 'app-access-create_app_permission',
    summary: docs.CREATE_APP_PERMISSION_SUMMARY,
    description: docs.APP_PERMISSION_DESCRIPTION,
    security: 'admin',
    request: { params: appIdParamsSchema, body: createAppPermissionBodySchema },
    responses: { 201: { description: 'App permission created.', schema: appPermissionSchema } },
    handler: controller.createAppPermission,
  })
  api.post({
    path: '/apps/:app_id/permissions/sync',
    operationId: 'app-access-sync_app_permissions',
    summary: docs.SYNC_APP_PERMISSIONS_SUMMARY,
    description: docs.APP_PERMISSION_DESCRIPTION,
    security: 'admin',
    request: { params: appIdParamsSchema, body: syncAppPermissionsBodySchema },
    responses: { 200: { description: 'Permission catalog synchronized.', schema: listObjectSchema(appPermissionSchema) } },
    handler: controller.syncAppPermissions,
  })
  api.patch({
    path: '/apps/:app_id/permissions/:permission_id',
    operationId: 'app-access-update_app_permission',
    summary: docs.UPDATE_APP_PERMISSION_SUMMARY,
    description: docs.APP_PERMISSION_DESCRIPTION,
    security: 'admin',
    request: { params: appPermissionIdParamsSchema, body: updateAppPermissionBodySchema },
    responses: { 200: { description: 'App permission updated.', schema: appPermissionSchema } },
    handler: controller.updateAppPermission,
  })
  api.delete({
    path: '/apps/:app_id/permissions/:permission_id',
    operationId: 'app-access-delete_app_permission',
    summary: docs.DELETE_APP_PERMISSION_SUMMARY,
    description: docs.APP_PERMISSION_DESCRIPTION,
    security: 'admin',
    request: { params: appPermissionIdParamsSchema },
    responses: { 200: { description: 'App permission deleted.', schema: appPermissionDeleteSchema } },
    handler: controller.deleteAppPermission,
  })

  api.get({
    path: '/apps/:app_id/roles',
    operationId: 'app-access-list_app_role_templates',
    summary: docs.LIST_APP_ROLE_TEMPLATES_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'admin',
    request: { params: appIdParamsSchema },
    responses: { 200: { description: 'App role templates returned.', schema: listObjectSchema(appRoleSchema) } },
    handler: controller.listAppRoleTemplates,
  })
  api.post({
    path: '/apps/:app_id/roles',
    operationId: 'app-access-create_app_role_template',
    summary: docs.CREATE_APP_ROLE_TEMPLATE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'admin',
    request: { params: appIdParamsSchema, body: createAppRoleBodySchema },
    responses: { 201: { description: 'App role template created.', schema: appRoleSchema } },
    handler: controller.createAppRoleTemplate,
  })
  api.get({
    path: '/apps/:app_id/roles/:role_id',
    operationId: 'app-access-retrieve_app_role_template',
    summary: docs.RETRIEVE_APP_ROLE_TEMPLATE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'admin',
    request: { params: appRoleIdParamsSchema },
    responses: { 200: { description: 'App role template returned.', schema: appRoleSchema } },
    handler: controller.retrieveAppRoleTemplate,
  })
  api.patch({
    path: '/apps/:app_id/roles/:role_id',
    operationId: 'app-access-update_app_role_template',
    summary: docs.UPDATE_APP_ROLE_TEMPLATE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'admin',
    request: { params: appRoleIdParamsSchema, body: updateAppRoleBodySchema },
    responses: { 200: { description: 'App role template updated.', schema: appRoleSchema } },
    handler: controller.updateAppRoleTemplate,
  })
  api.delete({
    path: '/apps/:app_id/roles/:role_id',
    operationId: 'app-access-delete_app_role_template',
    summary: docs.DELETE_APP_ROLE_TEMPLATE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'admin',
    request: { params: appRoleIdParamsSchema },
    responses: { 200: { description: 'App role template deleted.', schema: appRoleDeleteSchema } },
    handler: controller.deleteAppRoleTemplate,
  })

  api.get({
    path: '/organizations/:org_id/apps/:app_id/roles',
    operationId: 'app-access-list_org_app_roles',
    summary: docs.LIST_ORG_APP_ROLES_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'session',
    request: { params: orgAppParamsSchema },
    responses: { 200: { description: 'Organization app roles returned.', schema: listObjectSchema(appRoleSchema) } },
    handler: controller.listOrgAppRoles,
  })
  api.post({
    path: '/organizations/:org_id/apps/:app_id/roles',
    operationId: 'app-access-create_org_app_role',
    summary: docs.CREATE_ORG_APP_ROLE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'session',
    request: { params: orgAppParamsSchema, body: createAppRoleBodySchema },
    responses: { 201: { description: 'Organization app role created.', schema: appRoleSchema } },
    handler: controller.createOrgAppRole,
  })
  api.get({
    path: '/organizations/:org_id/apps/:app_id/roles/:role_id',
    operationId: 'app-access-retrieve_org_app_role',
    summary: docs.RETRIEVE_ORG_APP_ROLE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'session',
    request: { params: orgAppRoleIdParamsSchema },
    responses: { 200: { description: 'Organization app role returned.', schema: appRoleSchema } },
    handler: controller.retrieveOrgAppRole,
  })
  api.patch({
    path: '/organizations/:org_id/apps/:app_id/roles/:role_id',
    operationId: 'app-access-update_org_app_role',
    summary: docs.UPDATE_ORG_APP_ROLE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'session',
    request: { params: orgAppRoleIdParamsSchema, body: updateAppRoleBodySchema },
    responses: { 200: { description: 'Organization app role updated.', schema: appRoleSchema } },
    handler: controller.updateOrgAppRole,
  })
  api.delete({
    path: '/organizations/:org_id/apps/:app_id/roles/:role_id',
    operationId: 'app-access-delete_org_app_role',
    summary: docs.DELETE_ORG_APP_ROLE_SUMMARY,
    description: docs.APP_ROLE_DESCRIPTION,
    security: 'session',
    request: { params: orgAppRoleIdParamsSchema },
    responses: { 200: { description: 'Organization app role deleted.', schema: appRoleDeleteSchema } },
    handler: controller.deleteOrgAppRole,
  })

  api.get({
    path: '/organizations/:org_id/app-memberships',
    operationId: 'app-access-list_app_memberships',
    summary: docs.LIST_APP_MEMBERSHIPS_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: orgIdParamsSchema, query: listAppMembershipsQuerySchema },
    responses: { 200: { description: 'App memberships returned.', schema: listObjectSchema(appMembershipSchema) } },
    handler: controller.listAppMemberships,
  })
  api.post({
    path: '/organizations/:org_id/app-memberships',
    operationId: 'app-access-create_app_membership',
    summary: docs.CREATE_APP_MEMBERSHIP_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: orgIdParamsSchema, body: createAppMembershipBodySchema },
    responses: { 201: { description: 'App membership created.', schema: appMembershipSchema } },
    handler: controller.createAppMembership,
  })
  api.get({
    path: '/organizations/:org_id/app-memberships/:assignment_id',
    operationId: 'app-access-retrieve_app_membership',
    summary: docs.RETRIEVE_APP_MEMBERSHIP_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: assignmentIdParamsSchema },
    responses: { 200: { description: 'App membership returned.', schema: appMembershipSchema } },
    handler: controller.retrieveAppMembership,
  })
  api.patch({
    path: '/organizations/:org_id/app-memberships/:assignment_id',
    operationId: 'app-access-update_app_membership',
    summary: docs.UPDATE_APP_MEMBERSHIP_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: assignmentIdParamsSchema, body: updateAppMembershipBodySchema },
    responses: { 200: { description: 'App membership updated.', schema: appMembershipSchema } },
    handler: controller.updateAppMembership,
  })
  api.delete({
    path: '/organizations/:org_id/app-memberships/:assignment_id',
    operationId: 'app-access-delete_app_membership',
    summary: docs.DELETE_APP_MEMBERSHIP_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: assignmentIdParamsSchema },
    responses: { 200: { description: 'App membership revoked.', schema: appMembershipDeleteSchema } },
    handler: controller.deleteAppMembership,
  })

  api.get({
    path: '/organizations/:org_id/members/:membership_id/app-memberships',
    operationId: 'app-access-list_member_app_memberships',
    summary: docs.LIST_MEMBER_APP_MEMBERSHIPS_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: memberAppMembershipsParamsSchema },
    responses: { 200: { description: 'Member app memberships returned.', schema: listObjectSchema(appMembershipSchema) } },
    handler: controller.listAppMembershipsForMember,
  })

  // Literal /me is intentionally declared before the app roster sibling.
  api.get({
    path: '/organizations/:org_id/apps/:app_id/members/me',
    operationId: 'app-access-retrieve_app_member_me',
    summary: docs.RETRIEVE_APP_MEMBER_ME_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: orgAppParamsSchema },
    responses: { 200: { description: 'Acting member app access returned.', schema: appMembershipSchema } },
    handler: controller.retrieveMyAppMembership,
  })
  api.get({
    path: '/organizations/:org_id/apps/:app_id/members',
    operationId: 'app-access-list_app_members',
    summary: docs.LIST_APP_MEMBERS_SUMMARY,
    description: docs.APP_MEMBERSHIP_DESCRIPTION,
    security: 'session',
    request: { params: orgAppParamsSchema },
    responses: { 200: { description: 'App member roster returned.', schema: listObjectSchema(appMembershipSchema) } },
    handler: controller.listMembersForApp,
  })

  return api.router
}
