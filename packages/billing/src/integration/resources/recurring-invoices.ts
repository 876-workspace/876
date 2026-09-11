import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import {
  DeletedRecurringInvoiceSchema,
  InvoiceListSchema,
  RecurringInvoiceListSchema,
  RecurringInvoiceSchema,
} from '../../schemas'
import type {
  DeletedRecurringInvoice,
  InvoiceList,
  RecurringInvoice,
  RecurringInvoiceCreateParams,
  RecurringInvoiceList,
  RecurringInvoiceListParams,
  RecurringInvoiceUpdateParams,
} from '../../types'

export function createIntegrationRecurringInvoicesResource(
  runtime: IntegrationRuntime
) {
  const base = (organizationId: string) =>
    `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/recurring-invoices`
  return {
    list(organizationId: string, params: RecurringInvoiceListParams = {}) {
      return IntegrationRequest<RecurringInvoiceList>(
        runtime,
        {
          method: 'GET',
          path: base(organizationId),
          query: { status: params.status, customerId: params.customerId },
        },
        RecurringInvoiceListSchema
      )
    },
    create(organizationId: string, params: RecurringInvoiceCreateParams) {
      return IntegrationRequest<RecurringInvoice>(
        runtime,
        { method: 'POST', path: base(organizationId), body: params },
        RecurringInvoiceSchema
      )
    },
    retrieve(organizationId: string, id: string) {
      return IntegrationRequest<RecurringInvoice>(
        runtime,
        {
          method: 'GET',
          path: `${base(organizationId)}/${encodeURIComponent(id)}`,
        },
        RecurringInvoiceSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      params: RecurringInvoiceUpdateParams
    ) {
      return IntegrationRequest<RecurringInvoice>(
        runtime,
        {
          method: 'PATCH',
          path: `${base(organizationId)}/${encodeURIComponent(id)}`,
          body: params,
        },
        RecurringInvoiceSchema
      )
    },
    pause(organizationId: string, id: string) {
      return IntegrationRequest<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${base(organizationId)}/${encodeURIComponent(id)}/pause`,
          body: {},
        },
        RecurringInvoiceSchema
      )
    },
    resume(organizationId: string, id: string) {
      return IntegrationRequest<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${base(organizationId)}/${encodeURIComponent(id)}/resume`,
          body: {},
        },
        RecurringInvoiceSchema
      )
    },
    stop(organizationId: string, id: string) {
      return IntegrationRequest<RecurringInvoice>(
        runtime,
        {
          method: 'POST',
          path: `${base(organizationId)}/${encodeURIComponent(id)}/stop`,
          body: {},
        },
        RecurringInvoiceSchema
      )
    },
    delete(organizationId: string, id: string) {
      return IntegrationRequest<DeletedRecurringInvoice>(
        runtime,
        {
          method: 'DELETE',
          path: `${base(organizationId)}/${encodeURIComponent(id)}`,
        },
        DeletedRecurringInvoiceSchema
      )
    },
    listInvoices(organizationId: string, id: string) {
      return IntegrationRequest<InvoiceList>(
        runtime,
        {
          method: 'GET',
          path: `${base(organizationId)}/${encodeURIComponent(id)}/invoices`,
        },
        InvoiceListSchema
      )
    },
  }
}
