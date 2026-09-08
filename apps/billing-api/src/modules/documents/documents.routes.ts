import type { Request, Response } from 'express'
import { z, type ZodType } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { documentsController as controller } from './documents.controller'
import {
  CreditNoteApplySchema,
  CreditNoteCreateSchema,
  CreditNoteStatusSchema,
} from './schemas/credit-note'
import {
  IntegrationInvoiceCreateSchema,
  InvoiceCreateSchema,
  InvoiceFinalizeSchema,
  InvoiceUpdateSchema,
  InvoiceVoidSchema,
  InvoiceWriteOffSchema,
} from './schemas/invoice'
import { InvoicePreferenceUpdateSchema } from './schemas/invoice-preference'
import {
  IntegrationQuoteCreateSchema,
  QuoteCreateSchema,
  QuoteUpdateSchema,
} from './schemas/quote'

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>
const id = (name: string) => z.strictObject({ [name]: z.string().min(1) })
const org = z.strictObject({ organizationId: z.string().min(1) })
const orgInvoice = org.extend({ invoiceId: z.string().min(1) })
const orgQuote = org.extend({ quoteId: z.string().min(1) })
const resource = (name: string) =>
  z.object({ object: z.literal(name), id: z.string() }).passthrough()
const list = (name: string) =>
  z.strictObject({
    object: z.literal('list'),
    data: z.array(resource(name)),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
const errorResponse = {
  description: 'Client Error',
  schema: errorEnvelopeSchema,
}
const clientErrors = { '4XX': errorResponse }
const legacyErrors = { 422: errorResponse }
const documentStatus = z.enum([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELED',
])

function registerDraftCrud(
  api: ReturnType<typeof createApiRouter>,
  config: {
    plural: string
    object: string
    idName: string
    create: ZodType
    update: ZodType
    handlers: {
      list: Handler
      get: Handler
      create: Handler
      update: Handler
      del: Handler
    }
    ids: Record<string, string>
  }
) {
  const path = `/${config.plural}`
  const detail = `${path}/:${config.idName}`
  const params = id(config.idName)
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }
  api.get({
    path,
    summary: `List ${config.plural}`,
    operationId: config.ids.list,
    security: read,
    request: { query: z.strictObject({ status: documentStatus.optional() }) },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list(config.object)),
      },
      ...legacyErrors,
    },
    handler: config.handlers.list,
  })
  api.post({
    path,
    summary: `Create ${config.object}`,
    operationId: config.ids.create,
    security: write,
    request: { body: config.create },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource(config.object)),
      },
      ...legacyErrors,
    },
    handler: config.handlers.create,
  })
  api.get({
    path: detail,
    summary: `Retrieve ${config.object}`,
    operationId: config.ids.get,
    security: read,
    request: { params },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource(config.object)),
      },
      ...legacyErrors,
    },
    handler: config.handlers.get,
  })
  api.patch({
    path: detail,
    summary: `Update ${config.object}`,
    operationId: config.ids.update,
    security: write,
    request: { params, body: config.update },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource(config.object)),
      },
      ...legacyErrors,
    },
    handler: config.handlers.update,
  })
  api.delete({
    path: detail,
    summary: `Delete ${config.object}`,
    operationId: config.ids.del,
    security: write,
    request: { params },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(
          resource(config.object).extend({ deleted: z.literal(true) })
        ),
      },
      ...legacyErrors,
    },
    handler: config.handlers.del,
  })
}

export function createDocumentsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Invoices', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }
  registerDraftCrud(api, {
    plural: 'quotes',
    object: 'quote',
    idName: 'quoteId',
    create: QuoteCreateSchema,
    update: QuoteUpdateSchema,
    handlers: {
      list: controller.quotesList,
      get: controller.quotesGet,
      create: controller.quotesCreate,
      update: controller.quotesUpdate,
      del: controller.quotesDelete,
    },
    ids: {
      list: 'billing-billing_get_quotes',
      create: 'billing-billing_post_quotes',
      get: 'billing-billing_get_quotes_quoteId',
      update: 'billing-billing_patch_quotes_quoteId',
      del: 'billing-billing_delete_quotes_quoteId',
    },
  })
  function quoteAction(action: string, handler: Handler) {
    api.post({
      path: `/quotes/:quoteId/${action}`,
      summary: `${action[0]!.toUpperCase()}${action.slice(1)} a quote`,
      operationId: `billing-billing_post_quotes_quoteId_${action}`,
      security: write,
      request: { params: id('quoteId'), body: z.strictObject({}).default({}) },
      documentBody: false,
      responses: {
        200: {
          description: 'Successful Response',
          schema: successEnvelopeSchema(resource('quote')),
        },
        ...clientErrors,
      },
      handler,
    })
  }
  quoteAction('send', controller.quotesSend)
  quoteAction('accept', controller.quotesAccept)
  quoteAction('decline', controller.quotesDecline)
  quoteAction('cancel', controller.quotesCancel)
  const invoiceStatus = z.enum([
    'DRAFT',
    'OPEN',
    'SENT',
    'PARTIALLY_PAID',
    'OVERDUE',
    'PAID',
    'UNCOLLECTIBLE',
    'VOID',
  ])
  api.get({
    path: '/invoices',
    summary: 'List invoices',
    operationId: 'billing-billing_get_invoices',
    security: read,
    request: { query: z.strictObject({ status: invoiceStatus.optional() }) },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('invoice')),
      },
      ...legacyErrors,
    },
    handler: controller.invoicesList,
  })
  api.post({
    path: '/invoices',
    summary: 'Create an invoice',
    security: write,
    request: { body: InvoiceCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesCreate,
  })
  api.get({
    path: '/invoices/:invoiceId',
    summary: 'Retrieve an invoice',
    operationId: 'billing-billing_get_invoices_invoiceId',
    security: read,
    request: { params: id('invoiceId') },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...legacyErrors,
    },
    handler: controller.invoicesGet,
  })
  api.patch({
    path: '/invoices/:invoiceId',
    summary: 'Update an invoice',
    operationId: 'billing-billing_patch_invoices_invoiceId',
    security: write,
    request: { params: id('invoiceId'), body: InvoiceUpdateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...legacyErrors,
    },
    handler: controller.invoicesUpdate,
  })
  api.delete({
    path: '/invoices/:invoiceId',
    summary: 'Delete an invoice',
    operationId: 'billing-billing_delete_invoices_invoiceId',
    security: write,
    request: { params: id('invoiceId') },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(
          resource('invoice').extend({ deleted: z.literal(true) })
        ),
      },
      ...legacyErrors,
    },
    handler: controller.invoicesDelete,
  })
  api.post({
    path: '/invoices/:invoiceId/finalize',
    summary: 'Finalize an invoice',
    security: write,
    request: { params: id('invoiceId'), body: InvoiceFinalizeSchema },
    responses: {
      201: {
        description: 'invoice created',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesFinalize,
  })
  api.post({
    path: '/invoices/:invoiceId/send',
    summary: 'Record an invoice send',
    security: write,
    request: {
      params: id('invoiceId'),
      body: z.strictObject({}).default({}),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Invoice send recorded',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesSend,
  })
  api.post({
    path: '/invoices/:invoiceId/void',
    summary: 'Void an invoice',
    security: write,
    request: { params: id('invoiceId'), body: InvoiceVoidSchema },
    responses: {
      201: {
        description: 'invoice created',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesVoid,
  })
  api.post({
    path: '/invoices/:invoiceId/write-off',
    summary: 'Write off an invoice balance',
    security: write,
    request: { params: id('invoiceId'), body: InvoiceWriteOffSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Invoice balance written off',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesWriteOff,
  })
  api.get({
    path: '/credit-notes',
    summary: 'List credit notes',
    operationId: 'billing-billing_get_credit_notes',
    security: read,
    request: {
      query: z.strictObject({ status: CreditNoteStatusSchema.optional() }),
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('credit_note')),
      },
      ...legacyErrors,
    },
    handler: controller.creditNotesList,
  })
  api.post({
    path: '/credit-notes',
    summary: 'Create a credit note',
    operationId: 'billing-billing_post_credit_notes',
    security: write,
    request: { body: CreditNoteCreateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('credit_note')),
      },
      ...legacyErrors,
    },
    handler: controller.creditNotesCreate,
  })
  api.post({
    path: '/credit-notes/:creditNoteId/apply',
    summary: 'Apply a credit note',
    operationId: 'billing-billing_post_credit_notes_creditNoteId_apply',
    security: write,
    request: { params: id('creditNoteId'), body: CreditNoteApplySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Applied',
        schema: successEnvelopeSchema(resource('credit_note')),
      },
      ...legacyErrors,
    },
    handler: controller.creditNotesApply,
  })
  api.post({
    path: '/credit-notes/:creditNoteId/void',
    summary: 'Void a credit note',
    operationId: 'billing-billing_post_credit_notes_creditNoteId_void',
    security: write,
    request: {
      params: id('creditNoteId'),
      body: z.strictObject({}).default({}),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Voided',
        schema: successEnvelopeSchema(resource('credit_note')),
      },
      ...legacyErrors,
    },
    handler: controller.creditNotesVoid,
  })
  api.get({
    path: '/invoice-preferences',
    summary: 'Retrieve invoice preferences',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('invoice_preference')),
      },
      ...clientErrors,
    },
    handler: controller.preferencesGet,
  })
  api.patch({
    path: '/invoice-preferences',
    summary: 'Update invoice preferences',
    security: write,
    request: { body: InvoicePreferenceUpdateSchema },
    responses: {
      200: {
        description: 'Updated',
        schema: successEnvelopeSchema(resource('invoice_preference')),
      },
      ...clientErrors,
    },
    handler: controller.preferencesUpdate,
  })
  api.post({
    path: '/invoice-preferences/assess-late-fees',
    summary: 'Assess late fees',
    security: write,
    request: {
      body: z.strictObject({ asOf: z.number().int().positive().optional() }),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Assessed',
        schema: successEnvelopeSchema(resource('late_fee_run')),
      },
      ...clientErrors,
    },
    handler: controller.lateFees,
  })
  const base = '/integrations/organizations/:organizationId/invoices'
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.invoices.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.invoices.write',
  }
  api.get({
    path: base,
    summary: 'List organization Billing invoices',
    security: integrationRead,
    request: {
      params: org,
      query: z.strictObject({ status: invoiceStatus.optional() }),
    },
    responses: {
      200: {
        description: 'Invoice list',
        schema: successEnvelopeSchema(list('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationList,
  })
  api.post({
    path: base,
    summary: 'Create an organization Billing invoice',
    security: integrationWrite,
    request: { params: org, body: IntegrationInvoiceCreateSchema },
    responses: {
      200: {
        description: 'Invoice replayed',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      201: {
        description: 'Invoice created',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationCreate,
  })
  api.get({
    path: `${base}/:invoiceId`,
    summary: 'Retrieve an organization Billing invoice',
    security: integrationRead,
    request: { params: orgInvoice },
    responses: {
      200: {
        description: 'Invoice returned',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationGet,
  })
  api.patch({
    path: `${base}/:invoiceId`,
    summary: 'Update an organization Billing invoice',
    security: integrationWrite,
    request: { params: orgInvoice, body: InvoiceUpdateSchema },
    responses: {
      200: {
        description: 'Invoice updated',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationUpdate,
  })
  api.post({
    path: `${base}/:invoiceId/finalize`,
    summary: 'Finalize an organization Billing invoice',
    security: integrationWrite,
    request: { params: orgInvoice, body: InvoiceFinalizeSchema },
    responses: {
      200: {
        description: 'Invoice finalized',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationFinalize,
  })
  api.post({
    path: `${base}/:invoiceId/send`,
    summary: 'Record an organization Billing invoice send',
    security: integrationWrite,
    request: {
      params: orgInvoice,
      body: z.strictObject({}).default({}),
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Invoice send recorded',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationSend,
  })
  api.post({
    path: `${base}/:invoiceId/void`,
    summary: 'Void an organization Billing invoice',
    security: integrationWrite,
    request: { params: orgInvoice, body: InvoiceVoidSchema },
    responses: {
      200: {
        description: 'Invoice voided',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationVoid,
  })
  api.post({
    path: `${base}/:invoiceId/write-off`,
    summary: 'Write off an organization Billing invoice balance',
    security: integrationWrite,
    request: { params: orgInvoice, body: InvoiceWriteOffSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Invoice balance written off',
        schema: successEnvelopeSchema(resource('invoice')),
      },
      ...clientErrors,
    },
    handler: controller.invoicesIntegrationWriteOff,
  })
  const quoteBase = '/integrations/organizations/:organizationId/quotes'
  const quoteIntegrationRead = {
    kind: 'integration' as const,
    scope: 'billing.quotes.read',
  }
  const quoteIntegrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.quotes.write',
  }
  api.get({
    path: quoteBase,
    summary: 'List organization Billing quotes',
    security: quoteIntegrationRead,
    request: {
      params: org,
      query: z.strictObject({ status: documentStatus.optional() }),
    },
    responses: {
      200: {
        description: 'Quote list',
        schema: successEnvelopeSchema(list('quote')),
      },
      ...clientErrors,
    },
    handler: controller.quotesIntegrationList,
  })
  api.post({
    path: quoteBase,
    summary: 'Create an organization Billing quote',
    security: quoteIntegrationWrite,
    request: { params: org, body: IntegrationQuoteCreateSchema },
    responses: {
      201: {
        description: 'Quote created',
        schema: successEnvelopeSchema(resource('quote')),
      },
      ...clientErrors,
    },
    handler: controller.quotesIntegrationCreate,
  })
  api.get({
    path: `${quoteBase}/:quoteId`,
    summary: 'Retrieve an organization Billing quote',
    security: quoteIntegrationRead,
    request: { params: orgQuote },
    responses: {
      200: {
        description: 'Quote returned',
        schema: successEnvelopeSchema(resource('quote')),
      },
      ...clientErrors,
    },
    handler: controller.quotesIntegrationGet,
  })
  return api.router
}
