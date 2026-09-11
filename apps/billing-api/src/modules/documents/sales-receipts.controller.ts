import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { optionalCommandIdempotency } from '@/http/command-idempotency'
import { integrationAttribution } from '@/http/integration/idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  SalesReceiptCreateParams,
  SalesReceiptQuoteConversionParams,
  SalesReceiptRefundParams,
  SalesReceiptStatus,
  SalesReceiptVoidParams,
} from './schemas/sales-receipt'
import { salesReceiptsService as service } from './sales-receipts.service'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Document guard did not resolve a tenant.')
  return id
}

function param(req: Request, name: string) {
  return validParams<Record<string, string>>(req)[name]!
}

function sourceApp(req: Request) {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}

export const salesReceiptsController = {
  async list(req: Request, res: Response) {
    res.json(
      await service.list(
        tenant(req),
        validQuery<{ status?: SalesReceiptStatus }>(req).status
      )
    )
  },

  async get(req: Request, res: Response) {
    res.json(await service.get(tenant(req), param(req, 'salesReceiptId')))
  },

  async create(req: Request, res: Response) {
    const result = await service.create(
      tenant(req),
      validBody<SalesReceiptCreateParams>(req)
    )
    res.status(201).json(result.resource)
  },

  async convertQuote(req: Request, res: Response) {
    const result = await service.convertQuote(
      tenant(req),
      param(req, 'quoteId'),
      validBody<SalesReceiptQuoteConversionParams>(req)
    )
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },

  async refund(req: Request, res: Response) {
    const salesReceiptId = param(req, 'salesReceiptId')
    const body = validBody<SalesReceiptRefundParams>(req)
    res
      .status(201)
      .json(
        await service.refund(
          tenant(req),
          salesReceiptId,
          body,
          undefined,
          optionalCommandIdempotency(req, { salesReceiptId, body })
        )
      )
  },

  async void(req: Request, res: Response) {
    const salesReceiptId = param(req, 'salesReceiptId')
    const body = validBody<SalesReceiptVoidParams>(req)
    res
      .status(201)
      .json(
        await service.void(
          tenant(req),
          salesReceiptId,
          body,
          undefined,
          optionalCommandIdempotency(req, { salesReceiptId, body })
        )
      )
  },

  async integrationList(req: Request, res: Response) {
    res.json(
      await service.list(
        tenant(req),
        validQuery<{ status?: SalesReceiptStatus }>(req).status,
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/sales-receipts`
      )
    )
  },

  async integrationGet(req: Request, res: Response) {
    res.json(
      await service.get(
        tenant(req),
        param(req, 'salesReceiptId'),
        sourceApp(req)
      )
    )
  },

  async integrationCreate(req: Request, res: Response) {
    const body = validBody<SalesReceiptCreateParams>(req)
    const result = await service.create(
      tenant(req),
      body,
      integrationAttribution(
        req,
        getPrincipal(req),
        body as unknown as Record<string, unknown>
      )
    )
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },

  async integrationConvertQuote(req: Request, res: Response) {
    const body = validBody<SalesReceiptQuoteConversionParams>(req)
    const result = await service.convertQuote(
      tenant(req),
      param(req, 'quoteId'),
      body,
      integrationAttribution(
        req,
        getPrincipal(req),
        body as unknown as Record<string, unknown>
      )
    )
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },

  async integrationRefund(req: Request, res: Response) {
    const salesReceiptId = param(req, 'salesReceiptId')
    const body = validBody<SalesReceiptRefundParams>(req)
    res
      .status(201)
      .json(
        await service.refund(
          tenant(req),
          salesReceiptId,
          body,
          sourceApp(req),
          optionalCommandIdempotency(req, { salesReceiptId, body })
        )
      )
  },

  async integrationVoid(req: Request, res: Response) {
    const salesReceiptId = param(req, 'salesReceiptId')
    const body = validBody<SalesReceiptVoidParams>(req)
    res
      .status(201)
      .json(
        await service.void(
          tenant(req),
          salesReceiptId,
          body,
          sourceApp(req),
          optionalCommandIdempotency(req, { salesReceiptId, body })
        )
      )
  },
}
