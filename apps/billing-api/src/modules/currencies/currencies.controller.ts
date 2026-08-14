import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'

import type {
  CurrencyUpdateBody,
} from './currencies.schemas'
import {
  createCurrency,
  listCurrencies,
  removeCurrency,
  setDefaultCurrency,
  updateCurrency,
} from './currencies.service'

function tenantId(req: Request): string {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId) throw new Error('Tenant guard did not resolve a tenant.')
  return tenantId
}

export const currenciesController = {
  async list(req: Request, res: Response) {
    res.json(await listCurrencies(tenantId(req)))
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await createCurrency(tenantId(req), validBody(req)))
  },
  async setDefault(req: Request, res: Response) {
    const { currency } = validBody<{ currency: string }>(req)
    res.json(await setDefaultCurrency(tenantId(req), currency))
  },
  async update(req: Request, res: Response) {
    const { code } = validParams<{ code: string }>(req)
    res.json(
      await updateCurrency(
        tenantId(req),
        code,
        validBody<CurrencyUpdateBody>(req)
      )
    )
  },
  async remove(req: Request, res: Response) {
    const { code } = validParams<{ code: string }>(req)
    res.json(await removeCurrency(tenantId(req), code))
  },
}
