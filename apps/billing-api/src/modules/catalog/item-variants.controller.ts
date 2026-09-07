import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import {
  validBody,
  validParams,
  validQuery,
} from '@/http/middleware/validate'
import { itemVariantsService as service } from './item-variants.service'
import type {
  ItemMediaAttachParams,
  ItemMediaReorderParams,
  ItemStockAdjustmentParams,
  ItemVariantGenerateParams,
  ItemVariantUpdateParams,
} from './schemas/item'
import type { ItemPreferencesUpdateParams } from './schemas/item-preference'

type Query = { active?: string; q?: string; limit?: number }

function tenantId(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Catalog guard did not resolve a tenant.')
  return id
}

function param(req: Request, name: string) {
  return validParams<Record<string, string>>(req)[name]!
}

function sourceApp(req: Request) {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}

function active(value?: string) {
  return value === undefined ? undefined : value === 'true'
}

export const itemVariantsController = {
  async preferencesGet(req: Request, res: Response) {
    res.json(await service.getPreferences(tenantId(req)))
  },

  async preferencesUpdate(req: Request, res: Response) {
    res.json(
      await service.updatePreferences(
        tenantId(req),
        validBody<ItemPreferencesUpdateParams>(req),
        getPrincipal(req).userId ?? undefined
      )
    )
  },

  async list(req: Request, res: Response) {
    const query = validQuery<Query>(req)
    res.json(
      await service.list(
        tenantId(req),
        param(req, 'itemId'),
        undefined,
        `/api/v1/items/${param(req, 'itemId')}/variants`,
        active(query.active)
      )
    )
  },

  async search(req: Request, res: Response) {
    const query = validQuery<Query>(req)
    res.json(
      await service.search(
        tenantId(req),
        query.q ?? '',
        query.limit ?? 100
      )
    )
  },

  async get(req: Request, res: Response) {
    res.json(
      await service.retrieve(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId')
      )
    )
  },

  async generate(req: Request, res: Response) {
    res.json(
      await service.generate(
        tenantId(req),
        param(req, 'itemId'),
        validBody<ItemVariantGenerateParams>(req)
      )
    )
  },

  async update(req: Request, res: Response) {
    res.json(
      await service.update(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId'),
        validBody<ItemVariantUpdateParams>(req)
      )
    )
  },

  async adjustStock(req: Request, res: Response) {
    res.json(
      await service.adjustStock(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId'),
        validBody<ItemStockAdjustmentParams>(req),
        getPrincipal(req).userId ?? undefined
      )
    )
  },

  async mediaList(req: Request, res: Response) {
    res.json(await service.listMedia(tenantId(req), param(req, 'itemId')))
  },

  async mediaAttach(req: Request, res: Response) {
    res.json(
      await service.attachMedia(
        tenantId(req),
        param(req, 'itemId'),
        validBody<ItemMediaAttachParams>(req)
      )
    )
  },

  async mediaReorder(req: Request, res: Response) {
    res.json(
      await service.reorderMedia(
        tenantId(req),
        param(req, 'itemId'),
        validBody<ItemMediaReorderParams>(req)
      )
    )
  },

  async mediaRemove(req: Request, res: Response) {
    res.json(
      await service.removeMedia(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'fileId')
      )
    )
  },

  async variantMediaList(req: Request, res: Response) {
    res.json(
      await service.listMedia(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId')
      )
    )
  },

  async variantMediaAttach(req: Request, res: Response) {
    res.json(
      await service.attachMedia(
        tenantId(req),
        param(req, 'itemId'),
        validBody<ItemMediaAttachParams>(req),
        param(req, 'variantId')
      )
    )
  },

  async variantMediaReorder(req: Request, res: Response) {
    res.json(
      await service.reorderMedia(
        tenantId(req),
        param(req, 'itemId'),
        validBody<ItemMediaReorderParams>(req),
        param(req, 'variantId')
      )
    )
  },

  async variantMediaRemove(req: Request, res: Response) {
    res.json(
      await service.removeMedia(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'fileId'),
        param(req, 'variantId')
      )
    )
  },

  async integrationList(req: Request, res: Response) {
    const query = validQuery<Query>(req)
    const itemId = param(req, 'itemId')
    res.json(
      await service.list(
        tenantId(req),
        itemId,
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/items/${itemId}/variants`,
        active(query.active)
      )
    )
  },

  async integrationSearch(req: Request, res: Response) {
    const query = validQuery<Query>(req)
    res.json(
      await service.search(
        tenantId(req),
        query.q ?? '',
        query.limit ?? 100,
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/item-variants`
      )
    )
  },

  async integrationGet(req: Request, res: Response) {
    res.json(
      await service.retrieve(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId'),
        sourceApp(req)
      )
    )
  },

  async integrationGenerate(req: Request, res: Response) {
    res.json(
      await service.generate(
        tenantId(req),
        param(req, 'itemId'),
        validBody<ItemVariantGenerateParams>(req),
        sourceApp(req)
      )
    )
  },

  async integrationUpdate(req: Request, res: Response) {
    res.json(
      await service.update(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId'),
        validBody<ItemVariantUpdateParams>(req),
        sourceApp(req)
      )
    )
  },

  async integrationAdjustStock(req: Request, res: Response) {
    res.json(
      await service.adjustStock(
        tenantId(req),
        param(req, 'itemId'),
        param(req, 'variantId'),
        validBody<ItemStockAdjustmentParams>(req),
        getPrincipal(req).userId ?? undefined,
        sourceApp(req)
      )
    )
  },
}
