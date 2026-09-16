import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { documentEmailController as controller } from './document-email.controller'
import {
  DocumentEmailCompositionResponseSchema,
  DocumentEmailDeliveryResponseSchema,
  DocumentEmailPrepareQuerySchema,
  DocumentEmailSendSchema,
} from './schemas/email'

const id = (name: string) => z.strictObject({ [name]: z.string().min(1) })
const org = z.strictObject({ organizationId: z.string().min(1) })
const orgInvoice = org.extend({ invoiceId: z.string().min(1) })
const orgQuote = org.extend({ quoteId: z.string().min(1) })
const clientError = {
  description: 'Client Error',
  schema: errorEnvelopeSchema,
}
const clientErrors = { '4XX': clientError, '5XX': clientError }

export function createDocumentEmailRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Document Email', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }

  api.get({
    path: '/invoices/:invoiceId/email',
    summary: 'Prepare an invoice email',
    operationId: 'billing-billing_get_invoices_invoiceId_email',
    security: read,
    request: {
      params: id('invoiceId'),
      query: DocumentEmailPrepareQuerySchema,
    },
    responses: {
      200: {
        description: 'Prepared invoice email',
        schema: successEnvelopeSchema(DocumentEmailCompositionResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.invoicePrepare,
  })

  api.post({
    path: '/invoices/:invoiceId/send-email',
    summary: 'Send an invoice by email',
    operationId: 'billing-billing_post_invoices_invoiceId_send_email',
    security: write,
    request: { params: id('invoiceId'), body: DocumentEmailSendSchema },
    responses: {
      200: {
        description: 'Invoice email accepted for delivery',
        schema: successEnvelopeSchema(DocumentEmailDeliveryResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.invoiceSend,
  })

  api.get({
    path: '/quotes/:quoteId/email',
    summary: 'Prepare a quote email',
    operationId: 'billing-billing_get_quotes_quoteId_email',
    security: read,
    request: {
      params: id('quoteId'),
      query: DocumentEmailPrepareQuerySchema,
    },
    responses: {
      200: {
        description: 'Prepared quote email',
        schema: successEnvelopeSchema(DocumentEmailCompositionResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.quotePrepare,
  })

  api.post({
    path: '/quotes/:quoteId/send-email',
    summary: 'Send a quote by email',
    operationId: 'billing-billing_post_quotes_quoteId_send_email',
    security: write,
    request: { params: id('quoteId'), body: DocumentEmailSendSchema },
    responses: {
      200: {
        description: 'Quote email accepted for delivery',
        schema: successEnvelopeSchema(DocumentEmailDeliveryResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.quoteSend,
  })

  const invoiceBase = '/integrations/organizations/:organizationId/invoices'
  const quoteBase = '/integrations/organizations/:organizationId/quotes'
  const invoiceRead = {
    kind: 'integration' as const,
    scope: 'billing.invoices.read',
  }
  const invoiceWrite = {
    kind: 'integration' as const,
    scope: 'billing.invoices.write',
  }
  const quoteRead = {
    kind: 'integration' as const,
    scope: 'billing.quotes.read',
  }
  const quoteWrite = {
    kind: 'integration' as const,
    scope: 'billing.quotes.write',
  }

  api.get({
    path: `${invoiceBase}/:invoiceId/email`,
    summary: 'Prepare an organization invoice email',
    operationId:
      'billing-billing_get_integrations_organizations_organizationId_invoices_invoiceId_email',
    security: invoiceRead,
    request: {
      params: orgInvoice,
      query: DocumentEmailPrepareQuerySchema,
    },
    responses: {
      200: {
        description: 'Prepared invoice email',
        schema: successEnvelopeSchema(DocumentEmailCompositionResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.invoiceIntegrationPrepare,
  })

  api.post({
    path: `${invoiceBase}/:invoiceId/send-email`,
    summary: 'Send an organization invoice by email',
    operationId:
      'billing-billing_post_integrations_organizations_organizationId_invoices_invoiceId_send_email',
    security: invoiceWrite,
    request: { params: orgInvoice, body: DocumentEmailSendSchema },
    responses: {
      200: {
        description: 'Invoice email accepted for delivery',
        schema: successEnvelopeSchema(DocumentEmailDeliveryResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.invoiceIntegrationSend,
  })

  api.get({
    path: `${quoteBase}/:quoteId/email`,
    summary: 'Prepare an organization quote email',
    operationId:
      'billing-billing_get_integrations_organizations_organizationId_quotes_quoteId_email',
    security: quoteRead,
    request: { params: orgQuote, query: DocumentEmailPrepareQuerySchema },
    responses: {
      200: {
        description: 'Prepared quote email',
        schema: successEnvelopeSchema(DocumentEmailCompositionResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.quoteIntegrationPrepare,
  })

  api.post({
    path: `${quoteBase}/:quoteId/send-email`,
    summary: 'Send an organization quote by email',
    operationId:
      'billing-billing_post_integrations_organizations_organizationId_quotes_quoteId_send_email',
    security: quoteWrite,
    request: { params: orgQuote, body: DocumentEmailSendSchema },
    responses: {
      200: {
        description: 'Quote email accepted for delivery',
        schema: successEnvelopeSchema(DocumentEmailDeliveryResponseSchema),
      },
      ...clientErrors,
    },
    handler: controller.quoteIntegrationSend,
  })

  return api.router
}
