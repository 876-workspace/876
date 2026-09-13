import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { optionalCommandIdempotency } from '@/http/command-idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  SalesOrderCreateParams,
  SalesOrderListQuery,
  SalesOrderQuoteConversionParams,
  SalesOrderUpdateParams,
} from './schemas/sales-order'
import { salesOrdersService as service } from './sales-orders.service'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Document guard did not resolve a tenant.')
  return id
}

function param(req: Request, name: string) {
  return validParams<Record<string, string>>(req)[name]!
}

export const salesOrdersController = {
  async list(req: Request, res: Response) {
    res.json(
      await service.list(
        tenant(req),
        validQuery<SalesOrderListQuery>(req)
      )
    )
  },

  async get(req: Request, res: Response) {
    res.json(await service.get(tenant(req), param(req, 'salesOrderId')))
  },

  async create(req: Request, res: Response) {
    const body = validBody<SalesOrderCreateParams>(req)
    const result = await service.create(
      tenant(req),
      body,
      optionalCommandIdempotency(req, {
        body: req.body as Record<string, unknown>,
      })
    )
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },

  async update(req: Request, res: Response) {
    res.json(
      await service.update(
        tenant(req),
        param(req, 'salesOrderId'),
        validBody<SalesOrderUpdateParams>(req)
      )
    )
  },

  async confirm(req: Request, res: Response) {
    const salesOrderId = param(req, 'salesOrderId')
    res.json(
      await service.confirm(
        tenant(req),
        salesOrderId,
        optionalCommandIdempotency(req, { salesOrderId, action: 'confirm' })
      )
    )
  },

  async cancel(req: Request, res: Response) {
    const salesOrderId = param(req, 'salesOrderId')
    res.json(
      await service.cancel(
        tenant(req),
        salesOrderId,
        optionalCommandIdempotency(req, { salesOrderId, action: 'cancel' })
      )
    )
  },

  async complete(req: Request, res: Response) {
    const salesOrderId = param(req, 'salesOrderId')
    res.json(
      await service.complete(
        tenant(req),
        salesOrderId,
        optionalCommandIdempotency(req, { salesOrderId, action: 'complete' })
      )
    )
  },

  async convertQuote(req: Request, res: Response) {
    const result = await service.convertQuote(
      tenant(req),
      param(req, 'quoteId'),
      validBody<SalesOrderQuoteConversionParams>(req)
    )
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },

  async convertToInvoice(req: Request, res: Response) {
    const salesOrderId = param(req, 'salesOrderId')
    const result = await service.convertToInvoice(
      tenant(req),
      salesOrderId,
      optionalCommandIdempotency(req, {
        salesOrderId,
        action: 'convert-to-invoice',
      })
    )
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },
}
