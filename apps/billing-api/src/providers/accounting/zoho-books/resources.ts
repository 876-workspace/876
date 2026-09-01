import { z } from 'zod'

import type {
  AccountingProviderPage,
  AccountingProviderResource,
  AccountingProviderWriteResult,
  AccountingCustomerInput,
  AccountingEstimateInput,
  AccountingInvoiceInput,
  AccountingItemInput,
  AccountingPaymentInput,
  AccountingRecurringInvoiceInput,
} from '../types'
import { ZohoBooksClient } from './client'
import {
  toZohoContact,
  toZohoCustomerPayment,
  toZohoEstimate,
  toZohoInvoice,
  toZohoItem,
  toZohoRecurringInvoice,
} from './mappers'
import type {
  ZohoContact,
  ZohoCustomerPayment,
  ZohoEstimate,
  ZohoInvoice,
  ZohoItem,
  ZohoRecurringInvoice,
} from './types'

const pageContextSchema = z.object({
  page: z.number().int(),
  per_page: z.number().int(),
  has_more_page: z.boolean(),
})
const actionSchema = z
  .object({ code: z.number(), message: z.string() })
  .passthrough()

function page<T>(
  data: T[],
  ctx: z.infer<typeof pageContextSchema>
): AccountingProviderPage<T> {
  return {
    data,
    page: ctx.page,
    perPage: ctx.per_page,
    hasMore: ctx.has_more_page,
  }
}

function resource<TInput, TRecord extends object>(options: {
  path: string
  responseKey: string
  listKey: string
  idKey: string
  externalType: string
  map: (input: TInput) => unknown
  supportsActiveState?: boolean
}) {
  const client = new ZohoBooksClient()
  const recordSchema = z.object({ [options.idKey]: z.string() }).passthrough()
  const oneSchema = z
    .object({
      code: z.number(),
      message: z.string(),
      [options.responseKey]: recordSchema,
    })
    .passthrough()
  const listSchema = z
    .object({
      code: z.number(),
      message: z.string(),
      [options.listKey]: z.array(recordSchema),
      page_context: pageContextSchema,
    })
    .passthrough()

  function writeResult(
    record: Record<string, unknown>
  ): AccountingProviderWriteResult {
    return {
      externalId: String(record[options.idKey]),
      externalType: options.externalType,
      rawStatus: typeof record.status === 'string' ? record.status : null,
    }
  }

  const providerResource: AccountingProviderResource<TInput, TRecord> = {
    async create(ctx, input) {
      const response = await client.request({
        ctx,
        method: 'POST',
        path: options.path,
        body: options.map(input),
        schema: oneSchema,
      })
      return writeResult(
        response[options.responseKey] as Record<string, unknown>
      )
    },
    async update(ctx, externalId, input) {
      const response = await client.request({
        ctx,
        method: 'PUT',
        path: `${options.path}/${encodeURIComponent(externalId)}`,
        body: options.map(input),
        schema: oneSchema,
      })
      return writeResult(
        response[options.responseKey] as Record<string, unknown>
      )
    },
    async retrieve(ctx, externalId) {
      const response = await client.request({
        ctx,
        method: 'GET',
        path: `${options.path}/${encodeURIComponent(externalId)}`,
        schema: oneSchema,
      })
      return response[options.responseKey] as TRecord
    },
    async list(ctx, params = {}) {
      const response = await client.request({
        ctx,
        method: 'GET',
        path: options.path,
        query: { page: params.page ?? 1, per_page: params.perPage ?? 200 },
        schema: listSchema,
      })
      // `listSchema` is built with a computed key, which erases the static type
      // of its siblings. Re-narrow the already-validated page context rather
      // than casting it back.
      return page(
        response[options.listKey] as TRecord[],
        pageContextSchema.parse(response.page_context)
      )
    },
    async remove(ctx, externalId) {
      await client.request({
        ctx,
        method: 'DELETE',
        path: `${options.path}/${encodeURIComponent(externalId)}`,
        schema: actionSchema,
      })
    },
  }

  if (options.supportsActiveState) {
    providerResource.setActive = async (ctx, externalId, active) => {
      await client.request({
        ctx,
        method: 'POST',
        path: `${options.path}/${encodeURIComponent(externalId)}/${active ? 'active' : 'inactive'}`,
        schema: actionSchema,
      })
    }
  }

  return providerResource
}

export const zohoCustomers = resource<AccountingCustomerInput, ZohoContact>({
  path: '/contacts',
  responseKey: 'contact',
  listKey: 'contacts',
  idKey: 'contact_id',
  externalType: 'contact',
  map: toZohoContact,
  supportsActiveState: true,
})

export const zohoItems = resource<AccountingItemInput, ZohoItem>({
  path: '/items',
  responseKey: 'item',
  listKey: 'items',
  idKey: 'item_id',
  externalType: 'item',
  map: toZohoItem,
  supportsActiveState: true,
})

export const zohoEstimates = resource<AccountingEstimateInput, ZohoEstimate>({
  path: '/estimates',
  responseKey: 'estimate',
  listKey: 'estimates',
  idKey: 'estimate_id',
  externalType: 'estimate',
  map: toZohoEstimate,
})

export const zohoInvoices = resource<AccountingInvoiceInput, ZohoInvoice>({
  path: '/invoices',
  responseKey: 'invoice',
  listKey: 'invoices',
  idKey: 'invoice_id',
  externalType: 'invoice',
  map: toZohoInvoice,
})

export const zohoRecurringInvoices = resource<
  AccountingRecurringInvoiceInput,
  ZohoRecurringInvoice
>({
  path: '/recurringinvoices',
  responseKey: 'recurring_invoice',
  listKey: 'recurring_invoices',
  idKey: 'recurring_invoice_id',
  externalType: 'recurring-invoice',
  map: toZohoRecurringInvoice,
})

export const zohoPayments = resource<
  AccountingPaymentInput,
  ZohoCustomerPayment
>({
  path: '/customerpayments',
  responseKey: 'payment',
  listKey: 'customerpayments',
  idKey: 'payment_id',
  externalType: 'customer-payment',
  map: toZohoCustomerPayment,
})
