import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { validParams } from '@/http/middleware/validate'

import { reportingController as controller } from './reporting.controller'
import {
  cashSummaryQuerySchema,
  cashSummarySchema,
  customerSalesQuerySchema,
  customerSalesSchema,
  itemSalesQuerySchema,
  itemSalesSchema,
  itemSalesSummaryQuerySchema,
  itemSalesSummarySchema,
  organizationParamsSchema,
  receivablesAgingQuerySchema,
  receivablesAgingSchema,
  reportPreferencesSchema,
  reportPreferencesUpdateSchema,
  reportRangeQuerySchema,
  salesSummarySchema,
  subscriptionSummaryQuerySchema,
  subscriptionSummarySchema,
} from './reporting.schemas'
import { dashboardOverview } from './reporting.service'

const params = z.strictObject({ tenantId: z.string().min(1) })
async function dashboard(req: Request, res: Response) {
  const { tenantId } = validParams<z.infer<typeof params>>(req)
  res.json(await dashboardOverview(tenantId))
}

export function createInternalReportingRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Billing projections',
    registry: 'internal',
    resolveGuards,
  })
  api.get({
    path: '/projections/tenants/:tenantId/dashboard',
    summary: 'Retrieve the Billing dashboard projection',
    security: { kind: 'admin' },
    request: { params },
    responses: {
      200: {
        description: 'Dashboard projection',
        schema: successEnvelopeSchema(
          z.object({ object: z.literal('billing_dashboard') }).passthrough()
        ),
      },
    },
    handler: dashboard,
  })
  return api.router
}

const itemParams = z.strictObject({ itemId: z.string().min(1) })
const organizationItemParams = organizationParamsSchema.extend({
  itemId: z.string().min(1),
})
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

export function createReportingRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Reporting', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'reports:read' }
  // Reports are read-only derivatives of the invoice, sales-receipt,
  // credit-note, payment, and refund facts. `billing.invoices.read` is the
  // narrowest existing integration scope whose holders already receive that
  // sales surface; no new scope is created for reporting.
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.invoices.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.invoices.write',
  }

  api.get({
    path: '/reports/sales-summary',
    summary: 'Retrieve the sales summary report',
    security: read,
    request: { query: reportRangeQuerySchema },
    responses: {
      200: {
        description: 'Sales summary',
        schema: successEnvelopeSchema(salesSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.salesSummary,
  })
  api.get({
    path: '/reports/cash-summary',
    summary: 'Retrieve the cash summary report',
    security: read,
    request: { query: cashSummaryQuerySchema },
    responses: {
      200: {
        description: 'Cash summary',
        schema: successEnvelopeSchema(cashSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.cashSummary,
  })
  api.get({
    path: '/reports/receivables-aging',
    summary: 'Retrieve the receivables aging report',
    security: read,
    request: { query: receivablesAgingQuerySchema },
    responses: {
      200: {
        description: 'Receivables aging',
        schema: successEnvelopeSchema(receivablesAgingSchema),
      },
      ...clientErrors,
    },
    handler: controller.receivablesAging,
  })
  api.get({
    path: '/reports/item-sales',
    summary: 'Retrieve the item sales report',
    security: read,
    request: { query: itemSalesQuerySchema },
    responses: {
      200: {
        description: 'Item sales',
        schema: successEnvelopeSchema(itemSalesSchema),
      },
      ...clientErrors,
    },
    handler: controller.itemSales,
  })
  api.get({
    path: '/reports/customer-sales',
    summary: 'Retrieve the customer sales report',
    security: read,
    request: { query: customerSalesQuerySchema },
    responses: {
      200: {
        description: 'Customer sales',
        schema: successEnvelopeSchema(customerSalesSchema),
      },
      ...clientErrors,
    },
    handler: controller.customerSales,
  })
  api.get({
    path: '/reports/subscription-summary',
    summary: 'Retrieve the subscription summary report',
    security: read,
    request: { query: subscriptionSummaryQuerySchema },
    responses: {
      200: {
        description: 'Subscription summary',
        schema: successEnvelopeSchema(subscriptionSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.subscriptionSummary,
  })
  api.get({
    path: '/items/:itemId/sales-summary',
    summary: 'Retrieve the sales summary for one item',
    security: read,
    request: { params: itemParams, query: itemSalesSummaryQuerySchema },
    responses: {
      200: {
        description: 'Item sales summary',
        schema: successEnvelopeSchema(itemSalesSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.itemSalesSummary,
  })
  api.get({
    path: '/report-preferences',
    summary: 'Retrieve report preferences',
    security: read,
    responses: {
      200: {
        description: 'Report preferences returned',
        schema: successEnvelopeSchema(reportPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: controller.reportPreferencesGet,
  })
  api.patch({
    path: '/report-preferences',
    summary: 'Update report preferences',
    // The reporting timezone decides which day a sale is reported on, so it
    // is governed like invoice and quote preferences (`sales:write`) rather
    // than by the read-only reports permission.
    security: { kind: 'tenant' as const, permission: 'sales:write' },
    request: { body: reportPreferencesUpdateSchema },
    responses: {
      200: {
        description: 'Report preferences updated',
        schema: successEnvelopeSchema(reportPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: controller.reportPreferencesUpdate,
  })

  const base = '/integrations/organizations/:organizationId/reports'
  api.get({
    path: `${base}/sales-summary`,
    summary: 'Retrieve the organization sales summary report',
    security: integrationRead,
    request: {
      params: organizationParamsSchema,
      query: reportRangeQuerySchema,
    },
    responses: {
      200: {
        description: 'Sales summary',
        schema: successEnvelopeSchema(salesSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.salesSummary,
  })
  api.get({
    path: `${base}/cash-summary`,
    summary: 'Retrieve the organization cash summary report',
    security: integrationRead,
    request: {
      params: organizationParamsSchema,
      query: cashSummaryQuerySchema,
    },
    responses: {
      200: {
        description: 'Cash summary',
        schema: successEnvelopeSchema(cashSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.cashSummary,
  })
  api.get({
    path: `${base}/receivables-aging`,
    summary: 'Retrieve the organization receivables aging report',
    security: integrationRead,
    request: {
      params: organizationParamsSchema,
      query: receivablesAgingQuerySchema,
    },
    responses: {
      200: {
        description: 'Receivables aging',
        schema: successEnvelopeSchema(receivablesAgingSchema),
      },
      ...clientErrors,
    },
    handler: controller.receivablesAging,
  })
  api.get({
    path: `${base}/item-sales`,
    summary: 'Retrieve the organization item sales report',
    security: integrationRead,
    request: { params: organizationParamsSchema, query: itemSalesQuerySchema },
    responses: {
      200: {
        description: 'Item sales',
        schema: successEnvelopeSchema(itemSalesSchema),
      },
      ...clientErrors,
    },
    handler: controller.itemSales,
  })
  api.get({
    path: `${base}/customer-sales`,
    summary: 'Retrieve the organization customer sales report',
    security: integrationRead,
    request: {
      params: organizationParamsSchema,
      query: customerSalesQuerySchema,
    },
    responses: {
      200: {
        description: 'Customer sales',
        schema: successEnvelopeSchema(customerSalesSchema),
      },
      ...clientErrors,
    },
    handler: controller.customerSales,
  })
  api.get({
    path: `${base}/subscription-summary`,
    summary: 'Retrieve the organization subscription summary report',
    security: integrationRead,
    request: {
      params: organizationParamsSchema,
      query: subscriptionSummaryQuerySchema,
    },
    responses: {
      200: {
        description: 'Subscription summary',
        schema: successEnvelopeSchema(subscriptionSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.subscriptionSummary,
  })
  api.get({
    path: '/integrations/organizations/:organizationId/items/:itemId/sales-summary',
    summary: 'Retrieve the sales summary for one organization item',
    security: integrationRead,
    request: {
      params: organizationItemParams,
      query: itemSalesSummaryQuerySchema,
    },
    responses: {
      200: {
        description: 'Item sales summary',
        schema: successEnvelopeSchema(itemSalesSummarySchema),
      },
      ...clientErrors,
    },
    handler: controller.itemSalesSummary,
  })
  api.get({
    path: '/integrations/organizations/:organizationId/report-preferences',
    summary: 'Retrieve organization report preferences',
    security: integrationRead,
    request: { params: organizationParamsSchema },
    responses: {
      200: {
        description: 'Report preferences returned',
        schema: successEnvelopeSchema(reportPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: controller.reportPreferencesGet,
  })
  api.patch({
    path: '/integrations/organizations/:organizationId/report-preferences',
    summary: 'Update organization report preferences',
    security: integrationWrite,
    request: {
      params: organizationParamsSchema,
      body: reportPreferencesUpdateSchema,
    },
    responses: {
      200: {
        description: 'Report preferences updated',
        schema: successEnvelopeSchema(reportPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: controller.reportPreferencesUpdate,
  })

  return api.router
}
