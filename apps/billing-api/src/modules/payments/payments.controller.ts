import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { integrationAttribution } from '@/http/integration/idempotency'
import { validBody, validParams } from '@/http/middleware/validate'
import { paymentsService as service } from './payments.service'
import type {
  PaymentApplyParams,
  PaymentCreateParams,
  PaymentModeCreateParams,
  PaymentModeUpdateParams,
  PaymentUpdateParams,
} from './schemas/payment'
import type { RefundCreateParams } from './schemas/refund'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Payment guard did not resolve a tenant.')
  return id
}
function param(req: Request, name: string) {
  return validParams<Record<string, string>>(req)[name]!
}
function sourceApp(req: Request) {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}
export const paymentsController = {
  async modesList(req: Request, res: Response) {
    res.json(await service.listModes(tenant(req)))
  },
  async modesIntegrationList(req: Request, res: Response) {
    res.json(
      await service.listModes(
        tenant(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/payment-modes`
      )
    )
  },
  async modesGet(req: Request, res: Response) {
    res.json(await service.getMode(tenant(req), param(req, 'modeId')))
  },
  async modesCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createMode(
          tenant(req),
          validBody<PaymentModeCreateParams>(req)
        )
      )
  },
  async modesUpdate(req: Request, res: Response) {
    res.json(
      await service.updateMode(
        tenant(req),
        param(req, 'modeId'),
        validBody<PaymentModeUpdateParams>(req)
      )
    )
  },
  async modesDelete(req: Request, res: Response) {
    res.json(await service.deleteMode(tenant(req), param(req, 'modeId')))
  },
  async list(req: Request, res: Response) {
    res.json(await service.listPayments(tenant(req)))
  },
  async integrationList(req: Request, res: Response) {
    res.json(
      await service.listPayments(
        tenant(req),
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/payments`
      )
    )
  },
  async get(req: Request, res: Response) {
    res.json(await service.getPayment(tenant(req), param(req, 'paymentId')))
  },
  async integrationGet(req: Request, res: Response) {
    res.json(
      await service.getPayment(
        tenant(req),
        param(req, 'paymentId'),
        sourceApp(req)
      )
    )
  },
  async create(req: Request, res: Response) {
    const result = await service.createPayment(
      tenant(req),
      validBody<PaymentCreateParams>(req)
    )
    res.status(201).json(result.resource)
  },
  async integrationCreate(req: Request, res: Response) {
    const body = validBody<PaymentCreateParams>(req)
    const attribution = integrationAttribution(
      req,
      getPrincipal(req),
      body as unknown as Record<string, unknown>
    )
    const result = await service.createPayment(tenant(req), body, attribution)
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },
  async update(req: Request, res: Response) {
    res.json(
      await service.updatePayment(
        tenant(req),
        param(req, 'paymentId'),
        validBody<PaymentUpdateParams>(req)
      )
    )
  },
  async apply(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.applyPayment(
          tenant(req),
          param(req, 'paymentId'),
          validBody<PaymentApplyParams>(req)
        )
      )
  },
  async del(req: Request, res: Response) {
    res.json(await service.deletePayment(tenant(req), param(req, 'paymentId')))
  },
  async refundsList(req: Request, res: Response) {
    res.json(await service.listRefunds(tenant(req)))
  },
  async refundsCreate(req: Request, res: Response) {
    res
      .status(200)
      .json(
        await service.createRefund(
          tenant(req),
          validBody<RefundCreateParams>(req)
        )
      )
  },
}
