import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './organizations.controller'
import * as docs from './organizations.docs'
import {
  appIdParamsSchema,
  appSlugParamsSchema,
  batchSubscriptionsQuerySchema,
  inviteCreateBodySchema,
  inviteIdParamsSchema,
  inviteTokenParamsSchema,
  acceptInviteQuerySchema,
  listOrganizationsQuerySchema,
  organizationBootstrapBodySchema,
  organizationCreateBodySchema,
  organizationIdParamsSchema,
  organizationSlugParamsSchema,
  organizationUpdateBodySchema,
  orgProfileUpdateBodySchema,
  orgSetupBodySchema,
  orgIdParamsSchema,
  retrieveOrganizationQuerySchema,
  searchOrganizationsQuerySchema,
  subscriptionProvisionBodySchema,
  subscriptionUpdateBodySchema,
  organizationSchema,
  subscriptionSchema,
  inviteTokenSchema,
  invitePreviewSchema,
  membershipSchema,
} from './organizations.schemas'
import { paginationQuerySchema as basePagination } from '@/http/envelope'

export function registerOrganizationRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Organizations',
    prefix: '/organizations',
    security: 'apiKey',
    resolveGuards,
  })

  // Static / prefixed routes before /:id

  api.get({
    path: '/app-access/batch',
    security: 'admin',
    operationId: 'organizations-batch_list_subscriptions',
    summary: docs.LIST_SUBSCRIPTIONS_BATCH_SUMMARY,
    description: docs.LIST_SUBSCRIPTIONS_BATCH_DESCRIPTION,
    request: { query: batchSubscriptionsQuerySchema },
    responses: {
      200: {
        description: 'Batch subscriptions returned.',
        schema: z.object({
          object: z.literal('list'),
          data: z.array(subscriptionSchema),
          total_count: z.number().int(),
        }),
      },
    },
    handler: controller.batchListSubscriptions,
  })

  api.get({
    path: '/by-slug/:slug',
    security: 'admin',
    operationId: 'organizations-retrieve_organization_by_slug',
    summary: docs.RETRIEVE_ORG_BY_SLUG_SUMMARY,
    description: docs.RETRIEVE_ORG_BY_SLUG_DESCRIPTION,
    request: {
      params: organizationSlugParamsSchema,
      query: retrieveOrganizationQuerySchema,
    },
    responses: {
      200: {
        description: 'Organization returned.',
        schema: organizationSchema,
      },
      404: docs.RETRIEVE_ORG_BY_SLUG_RESPONSES[404],
    },
    handler: controller.retrieveOrganizationBySlug,
  })

  api.get({
    path: '/search',
    security: 'admin',
    operationId: 'organizations-search_organizations',
    summary: docs.SEARCH_ORGS_SUMMARY,
    description: docs.SEARCH_ORGS_DESCRIPTION,
    request: { query: searchOrganizationsQuerySchema },
    responses: {
      200: {
        description: 'Search results returned.',
        schema: listObjectSchema(organizationSchema),
      },
    },
    handler: controller.searchOrganizations,
  })

  api.get({
    path: '/invite/:token',
    security: 'apiKey',
    operationId: 'organizations-get_invite_preview',
    summary: 'Preview invite token',
    request: { params: inviteTokenParamsSchema },
    responses: {
      200: {
        description: 'Invite preview returned.',
        schema: invitePreviewSchema,
      },
      404: { description: 'Invite not found.' },
    },
    handler: controller.getInvitePreview,
  })

  api.post({
    path: '/invite/:token/accept',
    security: 'admin',
    operationId: 'organizations-accept_invite',
    summary: 'Accept invite token',
    request: {
      params: inviteTokenParamsSchema,
      query: acceptInviteQuerySchema,
    },
    responses: {
      200: { description: 'Membership returned.', schema: membershipSchema },
      404: { description: 'Invite not found.' },
    },
    handler: controller.acceptInvite,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'organizations-list_organizations',
    summary: docs.LIST_ORGS_SUMMARY,
    description: docs.LIST_ORGS_DESCRIPTION,
    request: { query: listOrganizationsQuerySchema },
    responses: {
      200: {
        description: 'Organizations returned.',
        schema: listObjectSchema(organizationSchema),
      },
    },
    handler: controller.listOrganizations,
  })

  api.post({
    path: '',
    security: 'admin',
    operationId: 'organizations-create_organization',
    summary: docs.CREATE_ORG_SUMMARY,
    description: docs.CREATE_ORG_DESCRIPTION,
    request: { body: organizationCreateBodySchema },
    responses: {
      201: { description: 'Organization created.', schema: organizationSchema },
      409: { description: 'Duplicate slug or WorkOS id.' },
    },
    handler: controller.createOrganization,
  })

  api.post({
    path: '/bootstrap',
    security: 'admin',
    operationId: 'organizations-bootstrap_organization',
    summary: docs.BOOTSTRAP_ORG_SUMMARY,
    description: docs.BOOTSTRAP_ORG_DESCRIPTION,
    request: { body: organizationBootstrapBodySchema },
    responses: {
      201: {
        description: 'Organization bootstrapped.',
        schema: organizationSchema,
      },
      404: { description: 'Owner not found.' },
    },
    handler: controller.bootstrapOrganization,
  })

  api.post({
    path: '/setup',
    security: 'admin',
    operationId: 'organizations-setup_organization',
    summary: 'Complete organization enrollment setup',
    request: { body: orgSetupBodySchema },
    responses: {
      200: {
        description: 'Organization setup completed.',
        schema: organizationSchema,
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.setupOrganization,
  })

  // Subscription / invite / membership sub-resources before generic :organization_id

  api.get({
    path: '/:org_id/apps/by-slug/:app_slug',
    security: 'admin',
    operationId: 'organizations-get_subscription_by_slug',
    summary: docs.GET_SUBSCRIPTION_BY_SLUG_SUMMARY,
    description: docs.GET_SUBSCRIPTION_BY_SLUG_DESCRIPTION,
    request: { params: appSlugParamsSchema },
    responses: {
      200: {
        description: 'Subscription returned.',
        schema: subscriptionSchema,
      },
      404: { description: 'Subscription not found.' },
    },
    handler: controller.getSubscriptionBySlug,
  })

  api.get({
    path: '/:org_id/apps/:app_id',
    security: 'admin',
    operationId: 'organizations-get_subscription',
    summary: docs.GET_SUBSCRIPTION_SUMMARY,
    description: docs.GET_SUBSCRIPTION_DESCRIPTION,
    request: { params: appIdParamsSchema },
    responses: {
      200: {
        description: 'Subscription returned.',
        schema: subscriptionSchema,
      },
      404: { description: 'Subscription not found.' },
    },
    handler: controller.getSubscription,
  })

  api.patch({
    path: '/:org_id/apps/:app_id',
    security: 'admin',
    operationId: 'organizations-update_subscription',
    summary: docs.UPDATE_SUBSCRIPTION_SUMMARY,
    description: docs.UPDATE_SUBSCRIPTION_DESCRIPTION,
    request: { params: appIdParamsSchema, body: subscriptionUpdateBodySchema },
    responses: {
      200: { description: 'Subscription updated.', schema: subscriptionSchema },
      404: { description: 'Subscription not found.' },
    },
    handler: controller.updateSubscription,
  })

  api.get({
    path: '/:org_id/apps',
    security: 'admin',
    operationId: 'organizations-list_org_subscriptions',
    summary: docs.LIST_ORG_SUBSCRIPTIONS_SUMMARY,
    description: docs.LIST_ORG_SUBSCRIPTIONS_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Subscriptions returned.',
        schema: z.array(subscriptionSchema),
      },
    },
    handler: controller.listOrgSubscriptions,
  })

  api.post({
    path: '/:org_id/apps',
    security: 'admin',
    operationId: 'organizations-provision_subscription',
    summary: docs.PROVISION_SUBSCRIPTION_SUMMARY,
    description: docs.PROVISION_SUBSCRIPTION_DESCRIPTION,
    request: {
      params: orgIdParamsSchema,
      body: subscriptionProvisionBodySchema,
    },
    responses: {
      201: {
        description: 'Subscription provisioned.',
        schema: subscriptionSchema,
      },
      404: { description: 'Organization or app not found.' },
    },
    handler: controller.provisionSubscription,
  })

  api.get({
    path: '/:org_id/subscriptions/by-slug/:app_slug',
    security: 'session',
    operationId: 'organizations-retrieve_my_org_subscription_by_slug',
    summary: docs.RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_SUMMARY,
    description: docs.RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_DESCRIPTION,
    request: { params: appSlugParamsSchema },
    responses: {
      200: {
        description: 'Subscription returned.',
        schema: subscriptionSchema,
      },
      404: { description: 'Subscription not found.' },
    },
    handler: controller.retrieveMyOrgSubscriptionBySlug,
  })

  api.get({
    path: '/:org_id/subscriptions',
    security: 'session',
    operationId: 'organizations-list_my_org_subscriptions',
    summary: docs.LIST_MY_ORG_SUBSCRIPTIONS_SUMMARY,
    description: docs.LIST_MY_ORG_SUBSCRIPTIONS_DESCRIPTION,
    request: { params: orgIdParamsSchema },
    responses: {
      200: {
        description: 'Subscriptions returned.',
        schema: listObjectSchema(subscriptionSchema),
      },
    },
    handler: controller.listMyOrgSubscriptions,
  })

  api.post({
    path: '/:org_id/subscriptions',
    security: 'session',
    operationId: 'organizations-provision_my_org_subscription',
    summary: docs.PROVISION_MY_ORG_SUBSCRIPTION_SUMMARY,
    description: docs.PROVISION_MY_ORG_SUBSCRIPTION_DESCRIPTION,
    request: {
      params: orgIdParamsSchema,
      body: subscriptionProvisionBodySchema,
    },
    responses: {
      201: {
        description: 'Subscription provisioned.',
        schema: subscriptionSchema,
      },
      404: { description: 'Organization or app not found.' },
    },
    handler: controller.provisionMyOrgSubscription,
  })

  // Memberships & invites (must be before generic :organization_id)

  api.get({
    path: '/:organization_id/memberships',
    security: 'admin',
    operationId: 'organizations-list_organization_memberships',
    summary: docs.LIST_ORG_MEMBERSHIPS_SUMMARY,
    description: docs.LIST_ORG_MEMBERSHIPS_DESCRIPTION,
    request: { params: organizationIdParamsSchema, query: basePagination },
    responses: {
      200: {
        description: 'Memberships returned.',
        schema: listObjectSchema(membershipSchema),
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.listOrganizationMemberships,
  })

  api.post({
    path: '/:organization_id/memberships',
    security: 'admin',
    operationId: 'organizations-create_organization_membership',
    summary: docs.CREATE_ORG_MEMBERSHIP_SUMMARY,
    description: docs.CREATE_ORG_MEMBERSHIP_DESCRIPTION,
    request: {
      params: organizationIdParamsSchema,
      body: z.strictObject({
        user_id: z.string(),
        role: z.string().optional(),
        status: z.string().optional(),
      }),
    },
    responses: {
      201: { description: 'Membership created.', schema: membershipSchema },
      404: { description: 'User not found.' },
    },
    handler: controller.createOrganizationMembership,
  })

  api.get({
    path: '/:organization_id/invites',
    security: 'session',
    operationId: 'organizations-list_organization_invites',
    summary: 'List organization invites',
    request: { params: organizationIdParamsSchema, query: basePagination },
    responses: {
      200: {
        description: 'Invites returned.',
        schema: listObjectSchema(inviteTokenSchema),
      },
    },
    handler: controller.listOrganizationInvites,
  })

  api.post({
    path: '/:organization_id/invites',
    security: 'session',
    operationId: 'organizations-create_organization_invite',
    summary: 'Create organization invite',
    request: {
      params: organizationIdParamsSchema,
      body: inviteCreateBodySchema,
    },
    responses: {
      201: { description: 'Invite created.', schema: inviteTokenSchema },
    },
    handler: controller.createOrganizationInvite,
  })

  api.delete({
    path: '/:organization_id/invites/:invite_id',
    security: 'session',
    operationId: 'organizations-revoke_organization_invite',
    summary: 'Revoke organization invite',
    request: { params: inviteIdParamsSchema },
    responses: {
      200: { description: 'Invite revoked.', schema: inviteTokenSchema },
      404: { description: 'Invite not found.' },
    },
    handler: controller.revokeOrganizationInvite,
  })

  // Profile routes before generic :organization_id

  api.get({
    path: '/:organization_id/profile',
    security: 'session',
    operationId: 'organizations-retrieve_organization_profile',
    summary: docs.RETRIEVE_ORG_PROFILE_SUMMARY,
    description: docs.RETRIEVE_ORG_PROFILE_DESCRIPTION,
    request: { params: organizationIdParamsSchema },
    responses: {
      200: {
        description: 'Organization profile returned.',
        schema: organizationSchema,
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.retrieveOrganizationProfile,
  })

  api.patch({
    path: '/:organization_id/profile',
    security: 'session',
    operationId: 'organizations-update_organization_profile',
    summary: docs.UPDATE_ORG_PROFILE_SUMMARY,
    description: docs.UPDATE_ORG_PROFILE_DESCRIPTION,
    request: {
      params: organizationIdParamsSchema,
      body: orgProfileUpdateBodySchema,
    },
    responses: {
      200: { description: 'Profile updated.', schema: organizationSchema },
      404: { description: 'Organization not found.' },
    },
    handler: controller.updateOrganizationProfile,
  })

  // Purge before generic delete

  api.delete({
    path: '/:organization_id/purge',
    security: 'admin',
    operationId: 'organizations-purge_organization',
    summary: 'Purge organization',
    request: { params: organizationIdParamsSchema },
    responses: {
      200: {
        description: 'Organization purged.',
        schema: z.object({
          object: z.literal('organization'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.purgeOrganization,
  })

  api.get({
    path: '/:organization_id',
    security: 'admin',
    operationId: 'organizations-retrieve_organization',
    summary: docs.RETRIEVE_ORG_SUMMARY,
    description: docs.RETRIEVE_ORG_DESCRIPTION,
    request: {
      params: organizationIdParamsSchema,
      query: retrieveOrganizationQuerySchema,
    },
    responses: {
      200: {
        description: 'Organization returned.',
        schema: organizationSchema,
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.retrieveOrganization,
  })

  api.patch({
    path: '/:organization_id',
    security: 'admin',
    operationId: 'organizations-update_organization',
    summary: docs.UPDATE_ORG_SUMMARY,
    description: docs.UPDATE_ORG_DESCRIPTION,
    request: {
      params: organizationIdParamsSchema,
      body: organizationUpdateBodySchema,
    },
    responses: {
      200: { description: 'Organization updated.', schema: organizationSchema },
      404: { description: 'Organization not found.' },
    },
    handler: controller.updateOrganization,
  })

  api.delete({
    path: '/:organization_id',
    security: 'admin',
    operationId: 'organizations-delete_organization',
    summary: docs.DELETE_ORG_SUMMARY,
    description: docs.DELETE_ORG_DESCRIPTION,
    request: { params: organizationIdParamsSchema },
    responses: {
      200: {
        description: 'Organization deleted.',
        schema: z.object({
          object: z.literal('organization'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: { description: 'Organization not found.' },
    },
    handler: controller.deleteOrganization,
  })

  return api.router
}
