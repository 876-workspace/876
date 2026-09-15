import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { documentTemplatesController as controller } from './document-templates.controller'
import {
  brandingResourceSchema,
  brandingUpdateSchema,
  deletedDocumentTemplateSchema,
  documentTemplateCreateBodySchema,
  documentTemplateIdParamsSchema,
  documentTemplateListQuerySchema,
  documentTemplateResolvedQuerySchema,
  documentTemplateSchema,
  documentTemplateUpdateBodySchema,
  integrationDocumentTemplateIdParamsSchema,
  resolvedDocumentTemplateSchema,
} from './document-templates.schemas'

const organizationParamsSchema = z.strictObject({
  organizationId: z.string().min(1),
})
const integrationListParamsSchema = organizationParamsSchema
const integrationResolvedParamsSchema = organizationParamsSchema
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}
const listSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(documentTemplateSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export function createDocumentTemplatesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Document templates', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.invoices.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.invoices.write',
  }

  api.get({
    path: '/document-templates',
    summary: 'List document templates',
    security: read,
    request: { query: documentTemplateListQuerySchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema),
      },
      ...clientErrors,
    },
    handler: controller.list,
  })
  api.post({
    path: '/document-templates',
    summary: 'Create a document template',
    security: write,
    request: { body: documentTemplateCreateBodySchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.create,
  })
  api.get({
    path: '/document-templates/resolved',
    summary: 'Resolve a document template',
    security: read,
    request: { query: documentTemplateResolvedQuerySchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resolvedDocumentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.resolve,
  })
  api.get({
    path: '/document-templates/:templateId',
    summary: 'Retrieve a document template',
    security: read,
    request: { params: documentTemplateIdParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.retrieve,
  })
  api.patch({
    path: '/document-templates/:templateId',
    summary: 'Update a document template',
    security: write,
    request: {
      params: documentTemplateIdParamsSchema,
      body: documentTemplateUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.update,
  })
  api.post({
    path: '/document-templates/:templateId/set-default',
    summary: 'Set the default document template',
    security: write,
    request: {
      params: documentTemplateIdParamsSchema,
      body: z.strictObject({}).default({}),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.setDefault,
  })
  api.delete({
    path: '/document-templates/:templateId',
    summary: 'Delete a document template',
    security: write,
    request: { params: documentTemplateIdParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deletedDocumentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.delete,
  })
  api.get({
    path: '/branding',
    summary: 'Retrieve branding',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(brandingResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.retrieveBranding,
  })
  api.patch({
    path: '/branding',
    summary: 'Update branding',
    security: write,
    request: { body: brandingUpdateSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(brandingResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.updateBranding,
  })

  const base = '/integrations/organizations/:organizationId'
  api.get({
    path: `${base}/document-templates`,
    summary: 'List organization document templates',
    security: integrationRead,
    request: {
      params: integrationListParamsSchema,
      query: documentTemplateListQuerySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema),
      },
      ...clientErrors,
    },
    handler: controller.list,
  })
  api.post({
    path: `${base}/document-templates`,
    summary: 'Create an organization document template',
    security: integrationWrite,
    request: {
      params: integrationListParamsSchema,
      body: documentTemplateCreateBodySchema,
    },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.create,
  })
  api.get({
    path: `${base}/document-templates/resolved`,
    summary: 'Resolve an organization document template',
    security: integrationRead,
    request: {
      params: integrationResolvedParamsSchema,
      query: documentTemplateResolvedQuerySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resolvedDocumentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.resolve,
  })
  api.get({
    path: `${base}/document-templates/:templateId`,
    summary: 'Retrieve an organization document template',
    security: integrationRead,
    request: { params: integrationDocumentTemplateIdParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.retrieve,
  })
  api.patch({
    path: `${base}/document-templates/:templateId`,
    summary: 'Update an organization document template',
    security: integrationWrite,
    request: {
      params: integrationDocumentTemplateIdParamsSchema,
      body: documentTemplateUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.update,
  })
  api.post({
    path: `${base}/document-templates/:templateId/set-default`,
    summary: 'Set an organization default document template',
    security: integrationWrite,
    request: {
      params: integrationDocumentTemplateIdParamsSchema,
      body: z.strictObject({}).default({}),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(documentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.setDefault,
  })
  api.delete({
    path: `${base}/document-templates/:templateId`,
    summary: 'Delete an organization document template',
    security: integrationWrite,
    request: { params: integrationDocumentTemplateIdParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deletedDocumentTemplateSchema),
      },
      ...clientErrors,
    },
    handler: controller.delete,
  })
  api.get({
    path: `${base}/branding`,
    summary: 'Retrieve organization branding',
    security: integrationRead,
    request: { params: organizationParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(brandingResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.retrieveBranding,
  })
  api.patch({
    path: `${base}/branding`,
    summary: 'Update organization branding',
    security: integrationWrite,
    request: { params: organizationParamsSchema, body: brandingUpdateSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(brandingResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.updateBranding,
  })

  return api.router
}
