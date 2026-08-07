/**
 * Onboarding routes. Every one is admin-tier, matching each FastAPI handler's
 * `_admin: AdminDep`.
 *
 * Route order matters here in a way it does not elsewhere in this service:
 * `/catalog/:target_type/:target_key/validate` must be declared **before**
 * nothing — it is a deeper path than the catalog retrieve and cannot be captured
 * by it — but the two `/organizations/...` paths differ only by a trailing
 * `/submit`, so the submit route is declared after the session routes it extends
 * to keep that relationship visible in the file.
 */

import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './onboarding.controller'
import * as docs from './onboarding.docs'
import {
  catalogParamsSchema,
  countryQuerySchema,
  onboardingAnswersReplaceSchema,
  onboardingCatalogSchema,
  onboardingSessionSchema,
  onboardingValidationSchema,
  sessionParamsSchema,
} from './onboarding.schemas'

export function createOnboardingRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Onboarding',
    prefix: '/onboarding',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '/catalog/:target_type/:target_key',
    operationId: 'onboarding-retrieve_catalog',
    summary: docs.RETRIEVE_CATALOG_SUMMARY,
    description: docs.RETRIEVE_CATALOG_DESCRIPTION,
    request: { params: catalogParamsSchema, query: countryQuerySchema },
    responses: {
      200: {
        description: 'Catalog returned.',
        schema: onboardingCatalogSchema,
      },
      404: { description: 'No catalog is registered for this target.' },
    },
    handler: controller.retrieveCatalog,
  })

  api.post({
    path: '/catalog/:target_type/:target_key/validate',
    operationId: 'onboarding-validate_answers',
    summary: docs.VALIDATE_ANSWERS_SUMMARY,
    description: docs.VALIDATE_ANSWERS_DESCRIPTION,
    request: {
      params: catalogParamsSchema,
      body: onboardingAnswersReplaceSchema,
    },
    responses: {
      200: {
        description: 'Validation result returned.',
        schema: onboardingValidationSchema,
      },
      404: { description: 'No catalog is registered for this target.' },
    },
    handler: controller.validateAnswers,
  })

  api.get({
    path: '/organizations/:organization_id/:target_type/:target_key',
    operationId: 'onboarding-retrieve_session',
    summary: docs.RETRIEVE_SESSION_SUMMARY,
    description: docs.RETRIEVE_SESSION_DESCRIPTION,
    request: { params: sessionParamsSchema, query: countryQuerySchema },
    responses: {
      200: {
        description: 'Session returned.',
        schema: onboardingSessionSchema,
      },
      404: { description: 'Organization or target not found.' },
    },
    handler: controller.retrieveSession,
  })

  api.put({
    path: '/organizations/:organization_id/:target_type/:target_key',
    operationId: 'onboarding-replace_answers',
    summary: docs.REPLACE_ANSWERS_SUMMARY,
    description: docs.REPLACE_ANSWERS_DESCRIPTION,
    request: {
      params: sessionParamsSchema,
      body: onboardingAnswersReplaceSchema,
    },
    responses: {
      200: { description: 'Answers saved.', schema: onboardingSessionSchema },
      404: { description: 'Organization or target not found.' },
    },
    handler: controller.replaceAnswers,
  })

  api.post({
    path: '/organizations/:organization_id/:target_type/:target_key/submit',
    operationId: 'onboarding-submit_session',
    summary: docs.SUBMIT_SESSION_SUMMARY,
    description: docs.SUBMIT_SESSION_DESCRIPTION,
    request: { params: sessionParamsSchema, query: countryQuerySchema },
    responses: {
      200: {
        description: 'Session submitted.',
        schema: onboardingSessionSchema,
      },
      404: { description: 'Organization, target, or saved session not found.' },
      422: { description: 'The saved answers failed validation.' },
    },
    handler: controller.submitSession,
  })

  return api.router
}
