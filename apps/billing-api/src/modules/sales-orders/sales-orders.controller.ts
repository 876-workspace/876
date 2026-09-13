import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { sendBillingList, sendBillingResult } from '@/http/result'

import * as service from './sales-orders.service'
import type {
  SalesOrderCreateBody,
  SalesOrderListQuery,
  SalesOrderUpdateBody,
} from './sales-orders.schemas'

function tenantId(req: Request): string {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId) throw new Error('Sales Order guard did not resolve a tenant.')
  return tenantId
}

function salesOrderId(req: Request): string {
  return validParams<{ salesOrderId: string }>(req).salesOrderId
}

export const salesOrdersController = {
  async list(req: Request, res: Response) {
    const result = await service.listSalesOrders(
      tenantId(req),
      validQuery<SalesOrderListQuery>(req)
    )
    sendBillingList(res, result, '/api/v1/sales-orders')
  },

  async retrieve(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.retrieveSalesOrder(tenantId(req), salesOrderId(req))
    )
  },

  async create(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.createSalesOrder(
        tenantId(req),
        validBody<SalesOrderCreateBody>(req)
      ),
      201
    )
  },

  async update(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.updateSalesOrder(
        tenantId(req),
        salesOrderId(req),
        validBody<SalesOrderUpdateBody>(req)
      )
    )
  },

  async del(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.deleteSalesOrder(tenantId(req), salesOrderId(req))
    )
  },

  async submit(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.submitSalesOrder(tenantId(req), salesOrderId(req))
    )
  },

  async confirm(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.confirmSalesOrder(tenantId(req), salesOrderId(req))
    )
  },

  async startProcessing(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.startSalesOrderProcessing(
        tenantId(req),
        salesOrderId(req)
      )
    )
  },

  async complete(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.completeSalesOrder(tenantId(req), salesOrderId(req))
    )
  },

  async cancel(req: Request, res: Response) {
    sendBillingResult(
      res,
      await service.cancelSalesOrder(tenantId(req), salesOrderId(req))
    )
  },
}
