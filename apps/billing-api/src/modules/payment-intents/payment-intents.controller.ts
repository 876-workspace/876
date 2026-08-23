import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { paymentIntentsService as service } from './payment-intents.service'
import type {
  PaymentIntentCancelParams,
  PaymentIntentCreateParams,
  PaymentIntentListQuery,
} from './schemas'
function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Payment intent guard did not resolve a tenant.')
  return id
}
const id = (req: Request) =>
  validParams<{ paymentIntentId: string }>(req).paymentIntentId
export const paymentIntentsController = {
  list: async (req: Request, res: Response) =>
    res.json(
      await service.list(tenant(req), validQuery<PaymentIntentListQuery>(req))
    ),
  get: async (req: Request, res: Response) =>
    res.json(await service.get(tenant(req), id(req))),
  create: async (req: Request, res: Response) => {
    const result = await service.create(
      tenant(req),
      validBody<PaymentIntentCreateParams>(req),
      req.header('Idempotency-Key') ?? undefined
    )
    res.status(result.replayed ? 200 : 201).json(result.intent)
  },
  confirm: async (req: Request, res: Response) =>
    res.json(await service.confirm(tenant(req), id(req))),
  capture: async (req: Request, res: Response) =>
    res.json(await service.capture(tenant(req), id(req))),
  cancel: async (req: Request, res: Response) =>
    res.json(
      await service.cancel(
        tenant(req),
        id(req),
        validBody<PaymentIntentCancelParams>(req)
      )
    ),
}
