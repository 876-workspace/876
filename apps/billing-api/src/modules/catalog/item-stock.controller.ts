import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'
import { adjustItemStock } from './item-stock.service'
import type { ItemStockAdjustmentParams } from './schemas/item'

function tenantId(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Catalog guard did not resolve a tenant.')
  return id
}

function itemId(req: Request) {
  return validParams<{ itemId: string }>(req).itemId
}

function sourceApp(req: Request) {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}

export const itemStockController = {
  async adjust(req: Request, res: Response) {
    res.json(
      await adjustItemStock(
        tenantId(req),
        itemId(req),
        validBody<ItemStockAdjustmentParams>(req),
        getPrincipal(req).userId ?? undefined
      )
    )
  },

  async integrationAdjust(req: Request, res: Response) {
    res.json(
      await adjustItemStock(
        tenantId(req),
        itemId(req),
        validBody<ItemStockAdjustmentParams>(req),
        getPrincipal(req).userId ?? undefined,
        sourceApp(req)
      )
    )
  },
}
