import { z } from 'zod'

import { listObjectSchema } from '@/http/envelope'
import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './application-provisioning-profile.controller'
import {
  applicationProvisioningAppParamsSchema,
  applicationProvisioningProfileCreateSchema,
  applicationProvisioningProfileParamsSchema,
  applicationProvisioningProfilePolicyReplaceSchema,
  applicationProvisioningProfilePolicyResponseSchema,
  applicationProvisioningProfileResponseSchema,
  applicationProvisioningProfileUpdateSchema,
} from './application-provisioning-profile.schemas'
import {
  provisioningDraftReplaceSchema,
  provisioningManifestResponseSchema,
  provisioningRevisionResponseSchema,
  provisioningValidationResponseSchema,
} from './provisioning.schemas'

export function createApplicationProvisioningProfileRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Provisioning',
    prefix: '/provisioning',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '/apps/:app_key/profiles',
    operationId: 'provisioning-list_application_profiles',
    summary: 'List application provisioning profiles',
    request: { params: applicationProvisioningAppParamsSchema },
    responses: {
      200: {
        description: 'Application provisioning profiles returned.',
        schema: listObjectSchema(applicationProvisioningProfileResponseSchema),
      },
      404: { description: 'Application not found.' },
    },
    handler: controller.listProfiles,
  })

  api.post({
    path: '/apps/:app_key/profiles',
    operationId: 'provisioning-create_application_profile',
    summary: 'Create application provisioning profile',
    description:
      'Creates a draft profile. Non-default variants become routable only after they have conditions, a published manifest, and are activated.',
    request: {
      params: applicationProvisioningAppParamsSchema,
      body: applicationProvisioningProfileCreateSchema,
    },
    responses: {
      201: {
        description: 'Application provisioning profile created.',
        schema: applicationProvisioningProfileResponseSchema,
      },
      404: { description: 'Application or copy source not found.' },
      409: { description: 'Profile key already exists or copy source is unpublished.' },
    },
    handler: controller.createProfile,
  })

  api.get({
    path: '/apps/:app_key/profiles/:profile_key',
    operationId: 'provisioning-retrieve_application_profile',
    summary: 'Retrieve application provisioning profile',
    request: { params: applicationProvisioningProfileParamsSchema },
    responses: {
      200: {
        description: 'Application provisioning profile returned.',
        schema: applicationProvisioningProfileResponseSchema,
      },
      404: { description: 'Application profile not found.' },
    },
    handler: controller.retrieveProfile,
  })

  api.patch({
    path: '/apps/:app_key/profiles/:profile_key',
    operationId: 'provisioning-update_application_profile',
    summary: 'Update application provisioning profile',
    request: {
      params: applicationProvisioningProfileParamsSchema,
      body: applicationProvisioningProfileUpdateSchema,
    },
    responses: {
      200: {
        description: 'Application provisioning profile updated.',
        schema: applicationProvisioningProfileResponseSchema,
      },
      404: { description: 'Application profile not found.' },
      409: { description: 'Profile lifecycle invariant would be violated.' },
    },
    handler: controller.updateProfile,
  })

  api.get({
    path: '/apps/:app_key/profiles/:profile_key/policy',
    operationId: 'provisioning-retrieve_application_profile_policy',
    summary: 'Retrieve application profile routing policy',
    request: { params: applicationProvisioningProfileParamsSchema },
    responses: {
      200: {
        description: 'Application profile routing policy returned.',
        schema: applicationProvisioningProfilePolicyResponseSchema,
      },
      404: { description: 'Application profile not found.' },
    },
    handler: controller.retrievePolicy,
  })

  api.put({
    path: '/apps/:app_key/profiles/:profile_key/policy',
    operationId: 'provisioning-replace_application_profile_policy',
    summary: 'Replace application profile routing policy',
    description:
      'Atomically replaces OR-of-AND profile match conditions. The default profile intentionally has no routing conditions.',
    request: {
      params: applicationProvisioningProfileParamsSchema,
      body: applicationProvisioningProfilePolicyReplaceSchema,
    },
    responses: {
      200: {
        description: 'Application profile routing policy replaced.',
        schema: applicationProvisioningProfilePolicyResponseSchema,
      },
      409: { description: 'Default profile cannot carry conditions.' },
      422: { description: 'Condition references an invalid setup or plan.' },
    },
    handler: controller.replacePolicy,
  })

  api.get({
    path: '/apps/:app_key/profiles/:profile_key/manifest',
    operationId: 'provisioning-retrieve_application_profile_manifest',
    summary: 'Retrieve application profile manifest',
    request: { params: applicationProvisioningProfileParamsSchema },
    responses: {
      200: {
        description: 'Application profile manifest returned.',
        schema: provisioningManifestResponseSchema,
      },
      404: { description: 'Manifest not found.' },
    },
    handler: controller.retrieveManifest,
  })

  api.get({
    path: '/apps/:app_key/profiles/:profile_key/published',
    operationId: 'provisioning-retrieve_application_profile_published',
    summary: 'Retrieve published application profile revision',
    request: { params: applicationProvisioningProfileParamsSchema },
    responses: {
      200: {
        description: 'Published application profile revision returned.',
        schema: provisioningRevisionResponseSchema,
      },
      404: { description: 'Published revision not found.' },
    },
    handler: controller.retrievePublished,
  })

  api.post({
    path: '/apps/:app_key/profiles/:profile_key/validate',
    operationId: 'provisioning-validate_application_profile_draft',
    summary: 'Validate application profile draft',
    request: {
      params: applicationProvisioningProfileParamsSchema,
      body: provisioningDraftReplaceSchema,
    },
    responses: {
      200: {
        description: 'Application profile draft validation result.',
        schema: provisioningValidationResponseSchema,
      },
    },
    handler: controller.validateDraft,
  })

  api.put({
    path: '/apps/:app_key/profiles/:profile_key/draft',
    operationId: 'provisioning-replace_application_profile_draft',
    summary: 'Replace application profile draft',
    request: {
      params: applicationProvisioningProfileParamsSchema,
      body: provisioningDraftReplaceSchema,
    },
    responses: {
      200: {
        description: 'Application profile draft replaced.',
        schema: provisioningRevisionResponseSchema,
      },
      422: { description: 'Draft is invalid for the application catalog.' },
    },
    handler: controller.replaceDraft,
  })

  api.post({
    path: '/apps/:app_key/profiles/:profile_key/publish',
    operationId: 'provisioning-publish_application_profile_draft',
    summary: 'Publish application profile draft',
    request: { params: applicationProvisioningProfileParamsSchema },
    responses: {
      200: {
        description: 'Application profile draft published.',
        schema: provisioningRevisionResponseSchema,
      },
      404: { description: 'Draft not found.' },
      422: { description: 'Draft is invalid for publication.' },
    },
    handler: controller.publishDraft,
  })

  return api.router
}
