import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import { paymentMethodsService as service } from './payment-methods.service'
import type {
  PaymentMethodCreateParams,
  PaymentMethodListQuery,
  PaymentMethodUpdateParams,
} from './schemas'
function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Payment method guard did not resolve a tenant.')
  return id
}
const id = (req: Request, name: string) =>
  validParams<Record<string, string>>(req)[name]!
export const paymentMethodsController = {
  list: async (req: Request, res: Response) =>
    res.json(
      await service.list(
        tenant(req),
        validQuery<PaymentMethodListQuery>(req),
        '/api/v1/payment-methods'
      )
    ),
  customerList: async (req: Request, res: Response) =>
    res.json(
      await service.list(
        tenant(req),
        {
          ...validQuery<PaymentMethodListQuery>(req),
          customerId: id(req, 'customerId'),
        },
        `/api/v1/customers/${id(req, 'customerId')}/payment-methods`
      )
    ),
  get: async (req: Request, res: Response) =>
    res.json(await service.get(tenant(req), id(req, 'paymentMethodId'))),
  create: async (req: Request, res: Response) =>
    res
      .status(201)
      .json(
        await service.create(
          tenant(req),
          validBody<PaymentMethodCreateParams>(req)
        )
      ),
  update: async (req: Request, res: Response) =>
    res.json(
      await service.update(
        tenant(req),
        id(req, 'paymentMethodId'),
        validBody<PaymentMethodUpdateParams>(req)
      )
    ),
  setDefault: async (req: Request, res: Response) =>
    res.json(await service.setDefault(tenant(req), id(req, 'paymentMethodId'))),
  detach: async (req: Request, res: Response) =>
    res.json(await service.detach(tenant(req), id(req, 'paymentMethodId'))),
}
