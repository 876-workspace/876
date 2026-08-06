import type { Request, Response } from 'express'

import { validParams } from '@/http/middleware/validate'

import type { listRegionsParamsSchema } from './geo.schemas'
import * as service from './geo.service'
import type { z } from 'zod'

/**
 * Controllers read validated input, call one service function, and choose the
 * status code. Nothing else — the rules live in the service, and the envelope
 * is applied by middleware, so a handler returns the resource itself.
 */

export async function listCurrencies(
  _req: Request,
  res: Response
): Promise<void> {
  res.status(200).json(await service.listCurrencies())
}

export async function listCountries(
  _req: Request,
  res: Response
): Promise<void> {
  res.status(200).json(await service.listCountries())
}

export async function listRegions(req: Request, res: Response): Promise<void> {
  const { country_code } =
    validParams<z.infer<typeof listRegionsParamsSchema>>(req)

  res.status(200).json(await service.listRegions(country_code))
}
