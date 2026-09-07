import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { taxController } from './tax.controller'
import { taxDocs } from './tax.docs'
import {
  taxAuthorityCreateBodySchema,
  taxAuthorityParamsSchema,
  taxAuthoritySchema,
  taxAuthorityUpdateBodySchema,
  taxRateCreateBodySchema,
  taxRateParamsSchema,
  taxRateSchema,
  taxRateUpdateBodySchema,
} from './tax.schemas'

function listSchema<T extends z.ZodType>(item: T) {
  return z.object({
    object: z.literal('list'),
    data: z.array(item),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
}
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}
export function createTaxRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  api.get({
    path: '/tax-authorities',
    ...taxDocs.listAuthorities,
    operationId: 'billing-billing_get_tax_authorities',
    security: { kind: 'tenant', permission: 'taxes:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(taxAuthoritySchema)),
      },
      ...clientErrors,
    },
    handler: taxController.listAuthorities,
  })
  api.post({
    path: '/tax-authorities',
    ...taxDocs.createAuthority,
    operationId: 'billing-billing_post_tax_authorities',
    security: { kind: 'tenant', permission: 'taxes:write' },
    request: { body: taxAuthorityCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(taxAuthoritySchema),
      },
      ...clientErrors,
    },
    handler: taxController.createAuthority,
  })
  api.patch({
    path: '/tax-authorities/:taxAuthorityId',
    ...taxDocs.updateAuthority,
    operationId: 'billing-billing_patch_tax_authorities_taxAuthorityId',
    security: { kind: 'tenant', permission: 'taxes:write' },
    request: {
      params: taxAuthorityParamsSchema,
      body: taxAuthorityUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(taxAuthoritySchema),
      },
      ...clientErrors,
    },
    handler: taxController.updateAuthority,
  })
  api.get({
    path: '/tax-rates',
    ...taxDocs.listRates,
    operationId: 'billing-billing_get_tax_rates',
    security: { kind: 'tenant', permission: 'taxes:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(taxRateSchema)),
      },
      ...clientErrors,
    },
    handler: taxController.listRates,
  })
  api.post({
    path: '/tax-rates',
    ...taxDocs.createRate,
    operationId: 'billing-billing_post_tax_rates',
    security: { kind: 'tenant', permission: 'taxes:write' },
    request: { body: taxRateCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(taxRateSchema),
      },
      ...clientErrors,
    },
    handler: taxController.createRate,
  })
  api.patch({
    path: '/tax-rates/:taxRateId',
    ...taxDocs.updateRate,
    operationId: 'billing-billing_patch_tax_rates_taxRateId',
    security: { kind: 'tenant', permission: 'taxes:write' },
    request: { params: taxRateParamsSchema, body: taxRateUpdateBodySchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(taxRateSchema),
      },
      ...clientErrors,
    },
    handler: taxController.updateRate,
  })
  const org = z.strictObject({ organizationId: z.string().min(1) })
  const authorityParams = org.extend({ taxAuthorityId: z.string().min(1) })
  const rateParams = org.extend({ taxRateId: z.string().min(1) })
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.taxes.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.taxes.write',
  }
  const authorityBase =
    '/integrations/organizations/:organizationId/tax-authorities'
  const rateBase = '/integrations/organizations/:organizationId/tax-rates'
  api.get({
    path: authorityBase,
    summary: 'List organization tax authorities',
    security: integrationRead,
    request: { params: org },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(taxAuthoritySchema)),
      },
      ...clientErrors,
    },
    handler: taxController.listAuthorities,
  })
  api.post({
    path: authorityBase,
    summary: 'Create an organization tax authority',
    security: integrationWrite,
    request: { params: org, body: taxAuthorityCreateBodySchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(taxAuthoritySchema),
      },
      ...clientErrors,
    },
    handler: taxController.createAuthority,
  })
  api.patch({
    path: `${authorityBase}/:taxAuthorityId`,
    summary: 'Update an organization tax authority',
    security: integrationWrite,
    request: { params: authorityParams, body: taxAuthorityUpdateBodySchema },
    responses: {
      200: {
        description: 'Updated',
        schema: successEnvelopeSchema(taxAuthoritySchema),
      },
      ...clientErrors,
    },
    handler: taxController.updateAuthority,
  })
  api.get({
    path: rateBase,
    summary: 'List organization tax rates',
    security: integrationRead,
    request: { params: org },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(taxRateSchema)),
      },
      ...clientErrors,
    },
    handler: taxController.listRates,
  })
  api.post({
    path: rateBase,
    summary: 'Create an organization tax rate',
    security: integrationWrite,
    request: { params: org, body: taxRateCreateBodySchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(taxRateSchema),
      },
      ...clientErrors,
    },
    handler: taxController.createRate,
  })
  api.patch({
    path: `${rateBase}/:taxRateId`,
    summary: 'Update an organization tax rate',
    security: integrationWrite,
    request: { params: rateParams, body: taxRateUpdateBodySchema },
    responses: {
      200: {
        description: 'Updated',
        schema: successEnvelopeSchema(taxRateSchema),
      },
      ...clientErrors,
    },
    handler: taxController.updateRate,
  })
  return api.router
}
