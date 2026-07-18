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
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/invoices`
}

function resourcePath(organizationId: string, invoiceId: string): string {
  return `${collectionPath(organizationId)}/${encodeURIComponent(invoiceId)}`
}

/** `$billing.invoices.*` — shared finance invoice integrations. */
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
  }
}
