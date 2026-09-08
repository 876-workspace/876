import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { documentsController as controller } from './documents.controller'
import { QuotePreferenceUpdateSchema } from './schemas/quote-preference'

type QuoteActionHandler =
  | typeof controller.quotesSend
  | typeof controller.quotesAccept
  | typeof controller.quotesDecline
  | typeof controller.quotesCancel
  | typeof controller.quotesExpire

const quoteId = z.strictObject({ quoteId: z.string().min(1) })
const orgQuoteId = z.strictObject({
  organizationId: z.string().min(1),
  quoteId: z.string().min(1),
})
const organizationId = z.strictObject({ organizationId: z.string().min(1) })
const emptyBody = z.strictObject({}).default({})
const resource = (name: string) =>
  z.object({ object: z.literal(name), id: z.string() }).passthrough()
const quotePreferenceResource = z.strictObject({
  object: z.literal('quote-preference'),
  acceptedQuoteConversion: z.enum(['manual', 'draft-invoice-on-accept']),
})
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

/**
 * Quote commands added after the original documents router was established.
 * Keeping this focused router separate avoids duplicating the legacy document
 * CRUD surface while the module migrates toward smaller route registries.
 */
export function createQuoteLifecycleRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Quotes', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.quotes.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.quotes.write',
  }

  api.post({
    path: '/quotes/:quoteId/expire',
    summary: 'Expire a quote whose expiry time has passed',
    operationId: 'billing-billing_post_quotes_quoteId_expire',
    security: write,
    request: { params: quoteId, body: emptyBody },
    documentBody: false,
    responses: {
      200: {
        description: 'Quote expired',
        schema: successEnvelopeSchema(resource('quote')),
      },
      ...clientErrors,
    },
    handler: controller.quotesExpire,
  })

  api.post({
    path: '/quotes/:quoteId/convert-to-invoice',
    summary: 'Convert an accepted quote to a draft invoice',
    operationId: 'billing-billing_post_quotes_quoteId_convert_to_invoice',
    security: write,
    request: { params: quoteId, body: emptyBody },
    documentBody: false,
    responses: {
      200: {
        description: 'Existing converted invoice returned',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      201: {
        description: 'Draft invoice created',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.quotesConvertToInvoice,
  })

  api.get({
    path: '/quote-preferences',
    summary: 'Retrieve quote preferences',
    operationId: 'billing-billing_get_quote_preferences',
    security: read,
    responses: {
      200: {
        description: 'Quote preferences',
        schema: successEnvelopeSchema(quotePreferenceResource),
      },
      ...clientErrors,
    },
    handler: controller.quotePreferencesGet,
  })

  api.patch({
    path: '/quote-preferences',
    summary: 'Update quote preferences',
    operationId: 'billing-billing_patch_quote_preferences',
    security: write,
    request: { body: QuotePreferenceUpdateSchema },
    responses: {
      200: {
        description: 'Quote preferences updated',
        schema: successEnvelopeSchema(quotePreferenceResource),
      },
      ...clientErrors,
    },
    handler: controller.quotePreferencesUpdate,
  })

  const integrationQuoteBase =
    '/integrations/organizations/:organizationId/quotes/:quoteId'
  const integrationPreferencePath =
    '/integrations/organizations/:organizationId/quote-preferences'

  function integrationQuoteAction(
    action: 'send' | 'accept' | 'decline' | 'cancel' | 'expire',
    handler: QuoteActionHandler
  ) {
    api.post({
      path: `${integrationQuoteBase}/${action}`,
      summary: `${action[0]!.toUpperCase()}${action.slice(1)} an organization Billing quote`,
      operationId: `billing-integration_post_quotes_quoteId_${action}`,
      security: integrationWrite,
      request: { params: orgQuoteId, body: emptyBody },
      documentBody: false,
      responses: {
        200: {
          description: 'Quote updated',
          schema: successEnvelopeSchema(resource('quote')),
        },
        ...clientErrors,
      },
      handler,
    })
  }

  integrationQuoteAction('send', controller.quotesSend)
  integrationQuoteAction('accept', controller.quotesAccept)
  integrationQuoteAction('decline', controller.quotesDecline)
  integrationQuoteAction('cancel', controller.quotesCancel)
  integrationQuoteAction('expire', controller.quotesExpire)

  api.post({
    path: `${integrationQuoteBase}/convert-to-invoice`,
    summary: 'Convert an organization Billing quote to a draft invoice',
    operationId: 'billing-integration_post_quotes_quoteId_convert_to_invoice',
    security: integrationWrite,
    request: { params: orgQuoteId, body: emptyBody },
    documentBody: false,
    responses: {
      200: {
        description: 'Existing converted invoice returned',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      201: {
        description: 'Draft invoice created',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.quotesConvertToInvoice,
  })

  api.get({
    path: integrationPreferencePath,
    summary: 'Retrieve organization quote preferences',
    operationId: 'billing-integration_get_quote_preferences',
    security: integrationRead,
    request: { params: organizationId },
    responses: {
      200: {
        description: 'Quote preferences',
        schema: successEnvelopeSchema(quotePreferenceResource),
      },
      ...clientErrors,
    },
    handler: controller.quotePreferencesGet,
  })

  api.patch({
    path: integrationPreferencePath,
    summary: 'Update organization quote preferences',
    operationId: 'billing-integration_patch_quote_preferences',
    security: integrationWrite,
    request: { params: organizationId, body: QuotePreferenceUpdateSchema },
    responses: {
      200: {
        description: 'Quote preferences updated',
        schema: successEnvelopeSchema(quotePreferenceResource),
      },
      ...clientErrors,
    },
    handler: controller.quotePreferencesUpdate,
  })

  return api.router
}
