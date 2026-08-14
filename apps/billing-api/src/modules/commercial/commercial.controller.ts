import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody } from '@/http/middleware/validate'

import type {
  PaymentTermCreateBody,
  SalespersonCreateBody,
} from './commercial.schemas'
import {
  createPaymentTerm,
  createSalesperson,
  listPaymentTerms,
  listSalespeople,
} from './commercial.service'

function tenantId(req: Request): string {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId) throw new Error('Tenant guard did not resolve a tenant.')
  return tenantId
}

export const commercialController = {
  async listPaymentTerms(req: Request, res: Response) {
    res.json(await listPaymentTerms(tenantId(req)))
  },
  async createPaymentTerm(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await createPaymentTerm(
          tenantId(req),
          validBody<PaymentTermCreateBody>(req)
        )
      )
  },
  async listSalespeople(req: Request, res: Response) {
    res.json(await listSalespeople(tenantId(req)))
  },
  async createSalesperson(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await createSalesperson(
          tenantId(req),
          validBody<SalespersonCreateBody>(req)
        )
      )
  },
}
