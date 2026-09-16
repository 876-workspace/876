import type {
  DocumentEmailComposition,
  DocumentEmailPrepareParams,
  DocumentEmailSendParams,
  DocumentEmailDelivery,
} from '../../types/document-email'
import {
  DocumentEmailCompositionSchema,
  DocumentEmailDeliverySchema,
} from '../../types/document-email.schema'
import { BillingInvoiceListSchema, BillingInvoiceSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingInvoice,
  BillingInvoiceCreateParams,
  BillingInvoiceFinalizeParams,
  BillingInvoiceList,
  BillingInvoiceListParams,
  BillingInvoiceUpdateParams,
  BillingInvoiceVoidParams,
  BillingInvoiceWriteOffParams,
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/invoices`
}

function resourcePath(organizationId: string, invoiceId: string): string {
  return `${collectionPath(organizationId)}/${encodeURIComponent(invoiceId)}`
}

/** `$876.billing.invoices.*` — shared finance invoice integrations. */
export function createIntegrationInvoicesResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string, params: BillingInvoiceListParams = {}) {
      return IntegrationRequest<BillingInvoiceList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: { status: params.status },
        },
        BillingInvoiceListSchema
      )
    },

    retrieve(organizationId: string, invoiceId: string) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        { method: 'GET', path: resourcePath(organizationId, invoiceId) },
        BillingInvoiceSchema
      )
    },

    create(
      organizationId: string,
      params: BillingInvoiceCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingInvoiceSchema
      )
    },

    update(
      organizationId: string,
      invoiceId: string,
      params: BillingInvoiceUpdateParams
    ) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(organizationId, invoiceId),
          body: params,
        },
        BillingInvoiceSchema
      )
    },

    finalize(
      organizationId: string,
      invoiceId: string,
      params: BillingInvoiceFinalizeParams = {}
    ) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, invoiceId)}/finalize`,
          body: params,
        },
        BillingInvoiceSchema
      )
    },

    send(organizationId: string, invoiceId: string) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, invoiceId)}/send`,
          body: {},
        },
        BillingInvoiceSchema
      )
    },

    prepareEmail(
      organizationId: string,
      invoiceId: string,
      params: DocumentEmailPrepareParams = {}
    ) {
      return IntegrationRequest<DocumentEmailComposition>(
        runtime,
        {
          method: 'GET',
          path: `${resourcePath(organizationId, invoiceId)}/email`,
          query: params,
        },
        DocumentEmailCompositionSchema
      )
    },

    sendEmail(
      organizationId: string,
      invoiceId: string,
      params: DocumentEmailSendParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<DocumentEmailDelivery>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, invoiceId)}/send-email`,
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        DocumentEmailDeliverySchema
      )
    },

    void(
      organizationId: string,
      invoiceId: string,
      params: BillingInvoiceVoidParams = {}
    ) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, invoiceId)}/void`,
          body: params,
        },
        BillingInvoiceSchema
      )
    },

    writeOff(
      organizationId: string,
      invoiceId: string,
      params: BillingInvoiceWriteOffParams
    ) {
      return IntegrationRequest<BillingInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${resourcePath(organizationId, invoiceId)}/write-off`,
          body: params,
        },
        BillingInvoiceSchema
      )
    },
  }
}
