import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './features.controller'
import * as docs from './features.docs'
import {
  createFeatureBodySchema,
  evaluateFeaturesQuerySchema,
  evaluateMeQuerySchema,
  featureDeletedSchema,
  featureGrantsSchema,
  featureIdParamsSchema,
  featureSchema,
  grantOrgFeatureBodySchema,
  grantUserFeatureBodySchema,
  listFeaturesQuerySchema,
  orgFeatureDeletedSchema,
  orgFeatureParamsSchema,
  orgFeatureSchema,
  organizationIdParamsSchema,
  updateFeatureBodySchema,
  updateOrgFeatureBodySchema,
  updateUserFeatureBodySchema,
  userFeatureDeletedSchema,
  userFeatureParamsSchema,
  userFeatureSchema,
  userIdParamsSchema,
} from './features.schemas'

export function createFeaturesRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Features',
    prefix: '/features',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '',
    operationId: 'features-list_features',
    summary: 'List features',
    description: docs.LIST_FEATURES_DESCRIPTION,
    request: { query: listFeaturesQuerySchema },
    responses: {
      200: {
        description: 'Features returned.',
        schema: listObjectSchema(featureSchema),
      },
    },
    handler: controller.listFeatures,
  })

  api.post({
    path: '',
    operationId: 'features-create_feature',
    summary: docs.CREATE_FEATURE_SUMMARY,
    description: docs.CREATE_FEATURE_DESCRIPTION,
    request: { body: createFeatureBodySchema },
    responses: {
      201: { description: 'Feature created.', schema: featureSchema },
    },
    handler: controller.createFeature,
  })

  // Sub-resources and literal prefixes before '/:feature_id' so Express cannot
  // match 'evaluate', 'users', or 'organizations' as an id.
  api.get({
    path: '/evaluate/me',
    security: 'session',
    operationId: 'features-evaluate_my_features',
    summary: 'Evaluate features for the current user',
    description:
      'Evaluates app features for the signed-in user and, when supplied, an organization they actively belong to.',
    request: { query: evaluateMeQuerySchema },
    responses: {
      200: {
        description: 'Features returned.',
        schema: listObjectSchema(featureSchema),
      },
    },
    handler: controller.evaluateMyFeatures,
  })

  api.get({
    path: '/evaluate',
    operationId: 'features-evaluate_features',
    summary: docs.EVALUATE_FEATURES_SUMMARY,
    description: docs.EVALUATE_FEATURES_DESCRIPTION,
    request: { query: evaluateFeaturesQuerySchema },
    responses: {
      200: {
        description: 'Features evaluated.',
        schema: listObjectSchema(featureSchema),
      },
    },
    handler: controller.evaluateFeatures,
  })

  api.get({
    path: '/users/:user_id/features',
    operationId: 'features-list_user_features',
    summary: 'List user feature grants',
    description: 'Returns all feature grants for a user. **Admin only**.',
    request: { params: userIdParamsSchema },
    responses: {
      200: {
        description: 'User features returned.',
        schema: listObjectSchema(userFeatureSchema),
      },
    },
    handler: controller.listUserFeatures,
  })

  api.post({
    path: '/users/:user_id/features',
    operationId: 'features-grant_user_feature',
    summary: docs.GRANT_USER_FEATURE_SUMMARY,
    description: docs.GRANT_USER_FEATURE_DESCRIPTION,
    request: { params: userIdParamsSchema, body: grantUserFeatureBodySchema },
    responses: {
      201: { description: 'Feature granted.', schema: userFeatureSchema },
    },
    handler: controller.grantUserFeature,
  })

  api.patch({
    path: '/users/:user_id/features/:feature_id',
    operationId: 'features-update_user_feature',
    summary: docs.UPDATE_USER_FEATURE_SUMMARY,
    description: docs.UPDATE_USER_FEATURE_DESCRIPTION,
    request: {
      params: userFeatureParamsSchema,
      body: updateUserFeatureBodySchema,
    },
    responses: {
      200: { description: 'Grant updated.', schema: userFeatureSchema },
    },
    handler: controller.updateUserFeature,
  })

  api.delete({
    path: '/users/:user_id/features/:feature_id',
    operationId: 'features-revoke_user_feature',
    summary: docs.REVOKE_USER_FEATURE_SUMMARY,
    description: docs.REVOKE_USER_FEATURE_DESCRIPTION,
    request: { params: userFeatureParamsSchema },
    responses: {
      200: {
        description: 'Grant revoked.',
        schema: userFeatureDeletedSchema,
      },
    },
    handler: controller.revokeUserFeature,
  })

  api.get({
    path: '/organizations/:organization_id/features',
    operationId: 'features-list_org_features',
    summary: docs.LIST_ORG_FEATURES_SUMMARY,
    description: docs.LIST_ORG_FEATURES_DESCRIPTION,
    request: { params: organizationIdParamsSchema },
    responses: {
      200: {
        description: 'Organization features returned.',
        schema: listObjectSchema(orgFeatureSchema),
      },
    },
    handler: controller.listOrgFeatures,
  })

  api.post({
    path: '/organizations/:organization_id/features',
    operationId: 'features-grant_org_feature',
    summary: docs.GRANT_ORG_FEATURE_SUMMARY,
    description: docs.GRANT_ORG_FEATURE_DESCRIPTION,
    request: {
      params: organizationIdParamsSchema,
      body: grantOrgFeatureBodySchema,
    },
    responses: {
      201: { description: 'Feature granted.', schema: orgFeatureSchema },
    },
    handler: controller.grantOrgFeature,
  })

  api.patch({
    path: '/organizations/:organization_id/features/:feature_id',
    operationId: 'features-update_org_feature',
    summary: docs.UPDATE_ORG_FEATURE_SUMMARY,
    description: docs.UPDATE_ORG_FEATURE_DESCRIPTION,
    request: {
      params: orgFeatureParamsSchema,
      body: updateOrgFeatureBodySchema,
    },
    responses: {
      200: { description: 'Grant updated.', schema: orgFeatureSchema },
    },
    handler: controller.updateOrgFeature,
  })

  api.delete({
    path: '/organizations/:organization_id/features/:feature_id',
    operationId: 'features-revoke_org_feature',
    summary: docs.REVOKE_ORG_FEATURE_SUMMARY,
    description: docs.REVOKE_ORG_FEATURE_DESCRIPTION,
    request: { params: orgFeatureParamsSchema },
    responses: {
      200: {
        description: 'Grant revoked.',
        schema: orgFeatureDeletedSchema,
      },
    },
    handler: controller.revokeOrgFeature,
  })

  api.get({
    path: '/:feature_id/grants',
    operationId: 'features-list_feature_grants',
    summary: docs.LIST_FEATURE_GRANTS_SUMMARY,
    description: docs.LIST_FEATURE_GRANTS_DESCRIPTION,
    request: { params: featureIdParamsSchema },
    responses: {
      200: {
        description: 'Feature grants returned.',
        schema: featureGrantsSchema,
      },
    },
    handler: controller.listFeatureGrants,
  })

  api.get({
    path: '/:feature_id',
    operationId: 'features-retrieve_feature',
    summary: 'Retrieve feature',
    description: docs.RETRIEVE_FEATURE_DESCRIPTION,
    request: { params: featureIdParamsSchema },
    responses: {
      200: { description: 'Feature returned.', schema: featureSchema },
    },
    handler: controller.retrieveFeature,
  })

  api.patch({
    path: '/:feature_id',
    operationId: 'features-update_feature',
    summary: 'Update feature metadata',
    description: docs.UPDATE_FEATURE_DESCRIPTION,
    request: { params: featureIdParamsSchema, body: updateFeatureBodySchema },
    responses: {
      200: { description: 'Feature updated.', schema: featureSchema },
    },
    handler: controller.updateFeature,
  })

  api.delete({
    path: '/:feature_id',
    operationId: 'features-delete_feature',
    summary: docs.DELETE_FEATURE_SUMMARY,
    description: docs.DELETE_FEATURE_DESCRIPTION,
    request: { params: featureIdParamsSchema },
    responses: {
      200: { description: 'Feature deleted.', schema: featureDeletedSchema },
    },
    handler: controller.deleteFeature,
  })

  return api.router
}
