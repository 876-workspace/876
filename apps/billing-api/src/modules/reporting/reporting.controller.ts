import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import {
  cashSummary,
  customerSales,
  getReportPreferences,
  itemSales,
  itemSalesSummary,
  receivablesAging,
  salesSummary,
  subscriptionSummary,
  updateReportPreferencesForTenant,
} from './reporting.service'
import type {
  CashSummaryQuery,
  CustomerSalesQuery,
  ItemSalesQuery,
  ItemSalesSummaryQuery,
  ReceivablesAgingQuery,
  ReportPreferencesUpdate,
  ReportRangeQuery,
  SubscriptionSummaryQuery,
} from './reporting.schemas'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Reporting guard did not resolve a tenant.')
  return id
}

function updatedBy(req: Request) {
  return getPrincipal(req).userId ?? undefined
}

export const reportingController = {
  async salesSummary(req: Request, res: Response) {
    res.json(await salesSummary(tenant(req), validQuery<ReportRangeQuery>(req)))
  },
  async cashSummary(req: Request, res: Response) {
    res.json(await cashSummary(tenant(req), validQuery<CashSummaryQuery>(req)))
  },
  async receivablesAging(req: Request, res: Response) {
    res.json(
      await receivablesAging(tenant(req), validQuery<ReceivablesAgingQuery>(req))
    )
  },
  async itemSales(req: Request, res: Response) {
    res.json(await itemSales(tenant(req), validQuery<ItemSalesQuery>(req)))
  },
  async customerSales(req: Request, res: Response) {
    res.json(
      await customerSales(tenant(req), validQuery<CustomerSalesQuery>(req))
    )
  },
  async subscriptionSummary(req: Request, res: Response) {
    res.json(
      await subscriptionSummary(
        tenant(req),
        validQuery<SubscriptionSummaryQuery>(req)
      )
    )
  },
  async itemSalesSummary(req: Request, res: Response) {
    res.json(
      await itemSalesSummary(
        tenant(req),
        validParams<{ itemId: string }>(req).itemId,
        validQuery<ItemSalesSummaryQuery>(req)
      )
    )
  },
  async reportPreferencesGet(req: Request, res: Response) {
    res.json(await getReportPreferences(tenant(req)))
  },
  async reportPreferencesUpdate(req: Request, res: Response) {
    res.json(
      await updateReportPreferencesForTenant(
        tenant(req),
        validBody<ReportPreferencesUpdate>(req),
        updatedBy(req)
      )
    )
  },
}
