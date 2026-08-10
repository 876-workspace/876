import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
  deletedObjectSchema,
} from '@/http/envelope'
import * as c from './team.controller'
import {
  idParamsSchema,
  memberBodySchema,
  memberPatchBodySchema,
  roleBodySchema,
  rolePatchBodySchema,
  roleSchema,
  memberListQuerySchema,
  teamMemberSchema,
  tenantParamsSchema,
} from './team.schemas'
export function createTeamRouter(resolveGuards: GuardResolver) {
  const roles = createApiRouter({
    tag: 'Roles',
    prefix: '/v1/tenants/:tenantId/roles',
    resolveGuards,
  })
  roles.get({
    path: '',
    security: 'admin',
    operationId: 'roles-list',
    summary: 'List tenant roles',
    request: { params: tenantParamsSchema },
    responses: {
      200: {
        description: 'Roles returned.',
        schema: successEnvelopeSchema(listObjectSchema(roleSchema)),
      },
    },
    handler: c.listRoles,
  })
  roles.post({
    path: '',
    security: 'admin',
    operationId: 'roles-create',
    summary: 'Create a role',
    request: { params: tenantParamsSchema, body: roleBodySchema },
    responses: {
      201: {
        description: 'Role created.',
        schema: successEnvelopeSchema(roleSchema),
      },
      409: { description: 'Conflict.', schema: errorEnvelopeSchema },
    },
    handler: c.createRole,
  })
  roles.get({
    path: '/:id',
    security: 'admin',
    operationId: 'roles-retrieve',
    summary: 'Retrieve a role',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Role returned.',
        schema: successEnvelopeSchema(roleSchema),
      },
      404: { description: 'Not found.', schema: errorEnvelopeSchema },
    },
    handler: c.retrieveRole,
  })
  roles.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'roles-update',
    summary: 'Update a role',
    request: { params: idParamsSchema, body: rolePatchBodySchema },
    responses: {
      200: {
        description: 'Role updated.',
        schema: successEnvelopeSchema(roleSchema),
      },
      404: { description: 'Not found.', schema: errorEnvelopeSchema },
      409: { description: 'Conflict.', schema: errorEnvelopeSchema },
    },
    handler: c.updateRole,
  })
  roles.delete({
    path: '/:id',
    security: 'admin',
    operationId: 'roles-delete',
    summary: 'Delete a role',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Role deleted.',
        schema: successEnvelopeSchema(deletedObjectSchema('role')),
      },
    },
    handler: c.deleteRole,
  })
  const team = createApiRouter({
    tag: 'Team',
    prefix: '/v1/tenants/:tenantId/team',
    resolveGuards,
  })
  team.get({
    path: '',
    security: 'admin',
    operationId: 'team-list',
    summary: 'List team members',
    request: { params: tenantParamsSchema, query: memberListQuerySchema },
    responses: {
      200: {
        description: 'Team returned.',
        schema: successEnvelopeSchema(listObjectSchema(teamMemberSchema)),
      },
    },
    handler: c.listMembers,
  })
  team.post({
    path: '',
    security: 'admin',
    operationId: 'team-create',
    summary: 'Add a team member',
    request: { params: tenantParamsSchema, body: memberBodySchema },
    responses: {
      201: {
        description: 'Member created.',
        schema: successEnvelopeSchema(teamMemberSchema),
      },
    },
    handler: c.createMember,
  })
  team.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'team-update',
    summary: 'Update a team member',
    request: { params: idParamsSchema, body: memberPatchBodySchema },
    responses: {
      200: {
        description: 'Member updated.',
        schema: successEnvelopeSchema(teamMemberSchema),
      },
    },
    handler: c.updateMember,
  })
  team.delete({
    path: '/:id',
    security: 'admin',
    operationId: 'team-delete',
    summary: 'Remove a team member',
    request: { params: idParamsSchema },
    responses: {
      200: {
        description: 'Team member removed.',
        schema: successEnvelopeSchema(deletedObjectSchema('team_member')),
      },
      404: { description: 'Not found.', schema: errorEnvelopeSchema },
      409: { description: 'Last active admin.', schema: errorEnvelopeSchema },
    },
    handler: c.deleteMember,
  })
  return [roles.router, team.router]
}
