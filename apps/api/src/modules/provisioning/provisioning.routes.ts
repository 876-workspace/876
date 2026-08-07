import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './provisioning.controller'
import * as docs from './provisioning.docs'
import {
  listNotesQuerySchema,
  listRunsQuerySchema,
  provisioningApplicationClaimRequestSchema,
  provisioningApplicationCompleteRequestSchema,
  provisioningCatalogParamsSchema,
  provisioningCatalogResponseSchema,
  provisioningDraftReplaceSchema,
  provisioningManifestParamsSchema,
  provisioningManifestResponseSchema,
  provisioningNoteCreateSchema,
  provisioningNoteDeleteResponseSchema,
  provisioningNoteParamsSchema,
  provisioningNoteResponseSchema,
  provisioningReconcileRequestSchema,
  provisioningReconcileResponseSchema,
  provisioningRevisionResponseSchema,
  provisioningRunIdParamsSchema,
  provisioningRunResponseSchema,
  provisioningValidationResponseSchema,
} from './provisioning.schemas'

export function createProvisioningRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Provisioning',
    prefix: '/provisioning',
    security: 'admin',
    resolveGuards,
  })

  // Catalog
  api.get({
    path: '/catalog/:target_type/:target_key',
    operationId: 'provisioning-retrieve_catalog',
    summary: docs.RETRIEVE_CATALOG_SUMMARY,
    description: docs.RETRIEVE_CATALOG_DESCRIPTION,
    request: { params: provisioningCatalogParamsSchema },
    responses: {
      200: {
        description: 'Catalog returned.',
        schema: provisioningCatalogResponseSchema,
      },
    },
    handler: controller.retrieveCatalog,
  })

  // Manifests
  api.get({
    path: '/manifests/:target_type/:target_key',
    operationId: 'provisioning-retrieve_manifest',
    summary: docs.RETRIEVE_MANIFEST_SUMMARY,
    description: docs.RETRIEVE_MANIFEST_DESCRIPTION,
    request: { params: provisioningManifestParamsSchema },
    responses: {
      200: {
        description: 'Manifest returned.',
        schema: provisioningManifestResponseSchema,
      },
      404: { description: 'Manifest not found.' },
    },
    handler: controller.retrieveManifest,
  })

  api.get({
    path: '/manifests/:target_type/:target_key/published',
    operationId: 'provisioning-retrieve_published_revision',
    summary: docs.RETRIEVE_PUBLISHED_SUMMARY,
    description: docs.RETRIEVE_PUBLISHED_DESCRIPTION,
    request: { params: provisioningManifestParamsSchema },
    responses: {
      200: {
        description: 'Published revision returned.',
        schema: provisioningRevisionResponseSchema,
      },
      404: { description: 'Published revision not found.' },
    },
    handler: controller.retrievePublished,
  })

  api.put({
    path: '/manifests/:target_type/:target_key/draft',
    operationId: 'provisioning-replace_draft',
    summary: docs.REPLACE_DRAFT_SUMMARY,
    description: docs.REPLACE_DRAFT_DESCRIPTION,
    request: {
      params: provisioningManifestParamsSchema,
      body: provisioningDraftReplaceSchema,
    },
    responses: {
      200: {
        description: 'Draft replaced.',
        schema: provisioningRevisionResponseSchema,
      },
    },
    handler: controller.replaceDraft,
  })

  api.post({
    path: '/manifests/:target_type/:target_key/validate',
    operationId: 'provisioning-validate_manifest_draft',
    summary: docs.VALIDATE_DRAFT_SUMMARY,
    description: docs.VALIDATE_DRAFT_DESCRIPTION,
    request: {
      params: provisioningManifestParamsSchema,
      body: provisioningDraftReplaceSchema,
    },
    responses: {
      200: {
        description: 'Validation result.',
        schema: provisioningValidationResponseSchema,
      },
    },
    handler: controller.validateDraft,
  })

  api.post({
    path: '/manifests/:target_type/:target_key/publish',
    operationId: 'provisioning-publish_draft',
    summary: docs.PUBLISH_DRAFT_SUMMARY,
    description: docs.PUBLISH_DRAFT_DESCRIPTION,
    request: { params: provisioningManifestParamsSchema },
    responses: {
      200: {
        description: 'Published revision returned.',
        schema: provisioningRevisionResponseSchema,
      },
      404: { description: 'Draft not found.' },
    },
    handler: controller.publishDraft,
  })

  // Notes — declare before generic runs/:run_id to avoid confusion (different prefix though)
  api.get({
    path: '/manifests/:target_type/:target_key/notes',
    operationId: 'provisioning-list_notes',
    summary: 'List provisioning notes',
    request: {
      params: provisioningManifestParamsSchema,
      query: listNotesQuerySchema,
    },
    responses: {
      200: {
        description: 'Notes returned.',
        schema: listObjectSchema(provisioningNoteResponseSchema),
      },
      404: { description: 'Manifest not found.' },
    },
    handler: controller.listNotes,
  })

  api.post({
    path: '/manifests/:target_type/:target_key/notes',
    operationId: 'provisioning-create_note',
    summary: 'Create a provisioning note',
    request: {
      params: provisioningManifestParamsSchema,
      body: provisioningNoteCreateSchema,
    },
    responses: {
      201: {
        description: 'Note created.',
        schema: provisioningNoteResponseSchema,
      },
      404: { description: 'Manifest not found.' },
    },
    handler: controller.createNote,
  })

  api.delete({
    path: '/manifests/:target_type/:target_key/notes/:note_id',
    operationId: 'provisioning-delete_note',
    summary: 'Delete a provisioning note',
    request: { params: provisioningNoteParamsSchema },
    responses: {
      200: {
        description: 'Note deleted.',
        schema: provisioningNoteDeleteResponseSchema,
      },
      404: { description: 'Note not found.' },
    },
    handler: controller.deleteNote,
  })

  // Runs — list before :run_id
  api.get({
    path: '/runs',
    operationId: 'provisioning-list_runs',
    summary: 'List provisioning runs',
    request: { query: listRunsQuerySchema },
    responses: {
      200: {
        description: 'Runs returned.',
        schema: listObjectSchema(provisioningRunResponseSchema),
      },
    },
    handler: controller.listRuns,
  })

  api.post({
    path: '/runs/application/claim',
    operationId: 'provisioning-claim_application_run',
    summary: 'Claim an application-owned provisioning run',
    request: { body: provisioningApplicationClaimRequestSchema },
    responses: {
      200: {
        description: 'Run claimed.',
        schema: provisioningRunResponseSchema,
      },
      404: { description: 'Target not found.' },
      409: { description: 'No claimable run.' },
    },
    handler: controller.claimApplicationRun,
  })

  api.post({
    path: '/runs/reconcile',
    operationId: 'provisioning-reconcile_runs',
    summary: 'Reconcile provisioning runs',
    request: { body: provisioningReconcileRequestSchema },
    responses: {
      200: {
        description: 'Reconciliation result.',
        schema: provisioningReconcileResponseSchema,
      },
      404: { description: 'Target not found.' },
    },
    handler: controller.reconcileRuns,
  })

  api.get({
    path: '/runs/:run_id',
    operationId: 'provisioning-retrieve_run',
    summary: 'Retrieve a provisioning run',
    request: { params: provisioningRunIdParamsSchema },
    responses: {
      200: {
        description: 'Run returned.',
        schema: provisioningRunResponseSchema,
      },
      404: { description: 'Run not found.' },
    },
    handler: controller.retrieveRun,
  })

  api.post({
    path: '/runs/:run_id/retry',
    operationId: 'provisioning-retry_run',
    summary: 'Retry a failed provisioning run',
    request: { params: provisioningRunIdParamsSchema },
    responses: {
      200: {
        description: 'Run retried.',
        schema: provisioningRunResponseSchema,
      },
      404: { description: 'Run not found.' },
      409: { description: 'Run not retryable.' },
    },
    handler: controller.retryRun,
  })

  api.post({
    path: '/runs/:run_id/complete',
    operationId: 'provisioning-complete_application_run',
    summary: 'Complete an application-owned provisioning run',
    request: {
      params: provisioningRunIdParamsSchema,
      body: provisioningApplicationCompleteRequestSchema,
    },
    responses: {
      200: {
        description: 'Run completed.',
        schema: provisioningRunResponseSchema,
      },
      404: { description: 'Run not found.' },
      409: { description: 'Run not completable.' },
    },
    handler: controller.completeApplicationRun,
  })

  return api.router
}
