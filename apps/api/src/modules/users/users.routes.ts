import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'
import * as docs from './users.docs'
import * as controller from './users.controller'
import {
  userSchema,
  ensuredUserSchema,
  currentUserSchema,
  userAppSchema,
  userAppsGroupSchema,
  userPinSchema,
  listUsersQuerySchema,
  listUserAppsBatchQuerySchema,
  searchUsersQuerySchema,
  getByUsernameQuerySchema,
  retrieveUserQuerySchema,
  userCreateBodySchema,
  userUpdateBodySchema,
  userEnsureBodySchema,
  userBanBodySchema,
  usernameAvailabilityQuerySchema,
  reservedUsernameCreateBodySchema,
  grantFeatureBodySchema,
  disableFeatureQuerySchema,
  userIdParamsSchema,
  userIdAndFeatureIdParamsSchema,
  userIdAndAccountIdParamsSchema,
  userIdAndGrantIdParamsSchema,
  accountSchema,
  authorizedAppSchema,
} from './users.schemas'

export function registerUserCoreRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  // Static routes before /:user_id
  api.get({
    path: '/me',
    security: 'session',
    operationId: 'users-retrieve_current_user',
    summary: 'Retrieve the current user',
    description:
      "Returns the signed-in user's own account identity and lifecycle state.",
    responses: {
      200: { description: 'Current user returned.', schema: currentUserSchema },
    },
    handler: controller.retrieveCurrentUser,
  })

  api.get({
    path: '/search',
    security: 'admin',
    operationId: 'users-search_users',
    summary: docs.SEARCH_USERS_SUMMARY,
    description: docs.SEARCH_USERS_DESCRIPTION,
    request: { query: searchUsersQuerySchema },
    responses: {
      200: {
        description: 'Search results.',
        schema: listObjectSchema(userSchema),
      },
    },
    handler: controller.searchUsers,
  })

  api.get({
    path: '/by-username/:username',
    security: 'admin',
    operationId: 'users-get_user_by_username',
    summary: docs.GET_BY_USERNAME_SUMMARY,
    description: docs.GET_BY_USERNAME_DESCRIPTION,
    request: {
      params: z.strictObject({ username: z.string() }),
      query: getByUsernameQuerySchema,
    },
    responses: {
      200: { description: 'User returned.', schema: userSchema },
      404: docs.GET_BY_USERNAME_RESPONSES[404],
    },
    handler: controller.getUserByUsername,
  })

  api.get({
    path: '/by-workos-id/:workos_user_id',
    security: 'admin',
    operationId: 'users-get_user_by_workos_id',
    summary: docs.GET_BY_WORKOS_ID_SUMMARY,
    description: docs.GET_BY_WORKOS_ID_DESCRIPTION,
    request: { params: z.strictObject({ workos_user_id: z.string() }) },
    responses: {
      200: { description: 'User returned.', schema: userSchema },
      404: docs.GET_BY_WORKOS_ID_RESPONSES[404],
    },
    handler: controller.getUserByWorkosId,
  })

  api.get({
    path: '/username-availability',
    security: 'admin',
    operationId: 'users-check_username_availability',
    summary: docs.USERNAME_AVAILABILITY_SUMMARY,
    description: docs.USERNAME_AVAILABILITY_DESCRIPTION,
    request: { query: usernameAvailabilityQuerySchema },
    responses: {
      200: {
        description: 'Availability checked.',
        schema: z.object({
          object: z.literal('username_availability'),
          username: z.string(),
          available: z.boolean(),
          code: z.string(),
          reason: z.string(),
        }),
      },
    },
    handler: controller.checkUsernameAvailability,
  })

  api.get({
    path: '/reserved-usernames',
    security: 'admin',
    operationId: 'users-list_reserved_usernames',
    summary: docs.LIST_RESERVED_USERNAMES_SUMMARY,
    description: docs.LIST_RESERVED_USERNAMES_DESCRIPTION,
    request: {},
    responses: {
      200: {
        description: 'Reserved usernames.',
        schema: listObjectSchema(
          z.object({
            object: z.literal('reserved_username'),
            username: z.string(),
            reason: z.string().nullable(),
            created_at: z.number().int(),
          })
        ),
      },
    },
    handler: controller.listReservedUsernames,
  })

  api.post({
    path: '/reserved-usernames',
    security: 'admin',
    operationId: 'users-create_reserved_username',
    summary: docs.CREATE_RESERVED_USERNAME_SUMMARY,
    description: docs.CREATE_RESERVED_USERNAME_DESCRIPTION,
    request: { body: reservedUsernameCreateBodySchema },
    responses: {
      201: {
        description: 'Reserved.',
        schema: z.object({
          object: z.literal('reserved_username'),
          username: z.string(),
          reason: z.string().nullable(),
          created_at: z.number().int(),
        }),
      },
      409: docs.CREATE_RESERVED_USERNAME_RESPONSES[409],
    },
    handler: controller.createReservedUsername,
  })

  api.delete({
    path: '/reserved-usernames/:username',
    security: 'admin',
    operationId: 'users-delete_reserved_username',
    summary: docs.DELETE_RESERVED_USERNAME_SUMMARY,
    description: docs.DELETE_RESERVED_USERNAME_DESCRIPTION,
    request: { params: z.strictObject({ username: z.string() }) },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('reserved_username'),
          username: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.DELETE_RESERVED_USERNAME_RESPONSES[404],
    },
    handler: controller.deleteReservedUsername,
  })

  api.post({
    path: '/ensure',
    security: 'apiKey',
    operationId: 'users-ensure_user',
    summary: docs.ENSURE_USER_SUMMARY,
    description: docs.ENSURE_USER_DESCRIPTION,
    request: { body: userEnsureBodySchema },
    responses: {
      200: { description: 'User ensured.', schema: ensuredUserSchema },
    },
    handler: controller.ensureUser,
  })

  api.post({
    path: '/backfill-usernames',
    security: 'admin',
    operationId: 'users-backfill_usernames',
    summary: docs.BACKFILL_USERNAMES_SUMMARY,
    description: docs.BACKFILL_USERNAMES_DESCRIPTION,
    request: {},
    responses: {
      200: {
        description: 'Backfilled.',
        schema: z.object({
          updated: z.number().int(),
          ids: z.array(z.string()),
        }),
      },
    },
    handler: controller.backfillUsernames,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'users-list_users',
    summary: docs.LIST_USERS_SUMMARY,
    description: docs.LIST_USERS_DESCRIPTION,
    request: { query: listUsersQuerySchema },
    responses: {
      200: {
        description: 'Users returned.',
        schema: listObjectSchema(userSchema),
      },
    },
    handler: controller.listUsers,
  })

  api.post({
    path: '',
    security: 'admin',
    operationId: 'users-create_user',
    summary: docs.CREATE_USER_SUMMARY,
    description: docs.CREATE_USER_DESCRIPTION,
    request: { body: userCreateBodySchema },
    responses: {
      201: { description: 'User created.', schema: userSchema },
      409: docs.CREATE_USER_RESPONSES[409],
    },
    handler: controller.createUser,
  })

  // Batch apps by users (session tier) before generic :user_id — static /apps MUST be before /:user_id
  api.get({
    path: '/apps',
    security: 'session',
    operationId: 'users-list_user_apps_batch',
    summary: docs.LIST_USER_APPS_BATCH_SUMMARY,
    description: docs.LIST_USER_APPS_BATCH_DESCRIPTION,
    request: { query: listUserAppsBatchQuerySchema },
    responses: {
      200: {
        description: 'Apps grouped by user.',
        schema: listObjectSchema(userAppsGroupSchema),
      },
    },
    handler: controller.listUserAppsBatch,
  })

  // OAuth grants / apps (session tier) before generic :user_id
  api.get({
    path: '/:user_id/oauth-grants',
    security: 'session',
    operationId: 'users-get_user_oauth_grants',
    summary: docs.LIST_OAUTH_GRANTS_SUMMARY,
    description: docs.LIST_OAUTH_GRANTS_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Grants returned.',
        schema: z.array(authorizedAppSchema),
      },
    },
    handler: controller.getUserOauthGrants,
  })

  api.post({
    path: '/:user_id/oauth-grants/:grant_id/revoke',
    security: 'session',
    operationId: 'users-revoke_user_oauth_grant',
    summary: docs.REVOKE_OAUTH_GRANT_SUMMARY,
    description: docs.REVOKE_OAUTH_GRANT_DESCRIPTION,
    request: { params: userIdAndGrantIdParamsSchema },
    responses: {
      200: {
        description: 'Revoked.',
        schema: z.object({ revoked: z.boolean() }),
      },
    },
    handler: controller.revokeUserOauthGrant,
  })

  api.get({
    path: '/:user_id/apps',
    security: 'admin',
    operationId: 'users-list_user_apps',
    summary: docs.LIST_USER_APPS_SUMMARY,
    description: docs.LIST_USER_APPS_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Apps returned.',
        schema: listObjectSchema(userAppSchema),
      },
    },
    handler: controller.listUserApps,
  })

  api.get({
    path: '/:user_id/accounts',
    security: 'admin',
    operationId: 'users-list_user_accounts',
    summary: docs.LIST_USER_ACCOUNTS_SUMMARY,
    description: docs.LIST_USER_ACCOUNTS_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Accounts returned.',
        schema: listObjectSchema(accountSchema),
      },
    },
    handler: controller.listUserAccounts,
  })

  api.delete({
    path: '/:user_id/accounts/:account_id',
    security: 'admin',
    operationId: 'users-unlink_user_account',
    summary: docs.UNLINK_USER_ACCOUNT_SUMMARY,
    description: docs.UNLINK_USER_ACCOUNT_DESCRIPTION,
    request: { params: userIdAndAccountIdParamsSchema },
    responses: {
      200: {
        description: 'Unlinked.',
        schema: z.object({
          object: z.literal('account'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.UNLINK_USER_ACCOUNT_RESPONSES[404],
    },
    handler: controller.unlinkUserAccount,
  })

  api.get({
    path: '/:user_id/features',
    security: 'admin',
    operationId: 'users-list_user_features',
    summary: docs.LIST_USER_FEATURES_SUMMARY,
    description: docs.LIST_USER_FEATURES_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Features.',
        schema: listObjectSchema(
          z.object({
            id: z.string(),
            user_id: z.string(),
            feature_id: z.string(),
            slug: z.string(),
            status: z.string(),
            note: z.string().nullable(),
            synced_at: z.number().int(),
            created_at: z.number().int(),
            updated_at: z.number().int(),
          })
        ),
      },
    },
    handler: controller.listUserFeatures,
  })

  api.post({
    path: '/:user_id/features',
    security: 'admin',
    operationId: 'users-grant_user_feature',
    summary: docs.GRANT_USER_FEATURE_SUMMARY,
    description: docs.GRANT_USER_FEATURE_DESCRIPTION,
    request: { params: userIdParamsSchema, body: grantFeatureBodySchema },
    responses: {
      201: {
        description: 'Granted.',
        schema: z.object({
          id: z.string(),
          user_id: z.string(),
          feature_id: z.string(),
          slug: z.string(),
          status: z.string(),
          note: z.string().nullable(),
          synced_at: z.number().int(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
    },
    handler: controller.grantUserFeature,
  })

  api.delete({
    path: '/:user_id/features/:feature_id',
    security: 'admin',
    operationId: 'users-disable_user_feature',
    summary: docs.DISABLE_USER_FEATURE_SUMMARY,
    description: docs.DISABLE_USER_FEATURE_DESCRIPTION,
    request: {
      params: userIdAndFeatureIdParamsSchema,
      query: disableFeatureQuerySchema,
    },
    responses: {
      200: {
        description: 'Disabled.',
        schema: z.object({
          id: z.string(),
          user_id: z.string(),
          feature_id: z.string(),
          slug: z.string(),
          status: z.string(),
          note: z.string().nullable(),
          synced_at: z.number().int(),
          created_at: z.number().int(),
          updated_at: z.number().int(),
        }),
      },
    },
    handler: controller.disableUserFeature,
  })

  api.post({
    path: '/:user_id/sessions/revoke',
    security: 'admin',
    operationId: 'users-revoke_user_sessions',
    summary: docs.REVOKE_USER_SESSIONS_SUMMARY,
    description: docs.REVOKE_USER_SESSIONS_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Revoked.',
        schema: z.object({
          object: z.literal('session_revoke'),
          user_id: z.string(),
          sessions_revoked: z.number().int(),
        }),
      },
    },
    handler: controller.revokeUserSessions,
  })

  api.post({
    path: '/:user_id/ban',
    security: 'admin',
    operationId: 'users-ban_user',
    summary: docs.BAN_USER_SUMMARY,
    description: docs.BAN_USER_DESCRIPTION,
    request: { params: userIdParamsSchema, body: userBanBodySchema },
    responses: {
      200: { description: 'Banned.', schema: userSchema },
      404: docs.BAN_USER_RESPONSES[404],
    },
    handler: controller.banUser,
  })

  api.post({
    path: '/:user_id/unban',
    security: 'admin',
    operationId: 'users-unban_user',
    summary: docs.UNBAN_USER_SUMMARY,
    description: docs.UNBAN_USER_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: { description: 'Unbanned.', schema: userSchema },
      404: docs.UNBAN_USER_RESPONSES[404],
    },
    handler: controller.unbanUser,
  })

  // Purge before generic delete
  api.delete({
    path: '/:user_id/purge',
    security: 'admin',
    operationId: 'users-purge_user',
    summary: 'Purge user',
    description: 'Permanently removes a user.',
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Purged.',
        schema: z.object({
          object: z.literal('user'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.DELETE_USER_RESPONSES[404],
    },
    handler: controller.purgeUser,
  })

  api.get({
    path: '/:user_id',
    security: 'admin',
    operationId: 'users-retrieve_user',
    summary: docs.RETRIEVE_USER_SUMMARY,
    description: docs.RETRIEVE_USER_DESCRIPTION,
    request: { params: userIdParamsSchema, query: retrieveUserQuerySchema },
    responses: {
      200: { description: 'User returned.', schema: userSchema },
      404: docs.RETRIEVE_USER_RESPONSES[404],
    },
    handler: controller.retrieveUser,
  })

  api.patch({
    path: '/:user_id',
    security: 'admin',
    operationId: 'users-update_user',
    summary: docs.UPDATE_USER_SUMMARY,
    description: docs.UPDATE_USER_DESCRIPTION,
    request: { params: userIdParamsSchema, body: userUpdateBodySchema },
    responses: {
      200: { description: 'User updated.', schema: userSchema },
      404: docs.UPDATE_USER_RESPONSES[404],
    },
    handler: controller.updateUser,
  })

  api.delete({
    path: '/:user_id',
    security: 'admin',
    operationId: 'users-delete_user',
    summary: docs.DELETE_USER_SUMMARY,
    description: docs.DELETE_USER_DESCRIPTION,
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('user'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.DELETE_USER_RESPONSES[404],
    },
    handler: controller.deleteUser,
  })

  return api.router
}
