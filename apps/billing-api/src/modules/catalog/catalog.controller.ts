import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { integrationAttribution } from '@/http/integration/idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import { active } from './catalog.schemas'
import { catalogService as service } from './catalog.service'
import type {
  AddonAssociationUpsertParams,
  AddonCloneParams,
  AddonCreateParams,
  AddonUpdateParams,
} from './schemas/addon'
import type { ItemCreateParams, ItemUpdateParams } from './schemas/item'
import type {
  PlanCloneParams,
  PlanCreateParams,
  PlanUpdateParams,
} from './schemas/plan'
import type {
  PriceListCreateParams,
  PriceListResolveParams,
  PriceListUpdateParams,
} from './schemas/price-list'
import type { PriceCreateParams, PriceUpdateParams } from './schemas/price'
import type {
  ProductCreateParams,
  ProductUpdateParams,
} from './schemas/product'
import type {
  PlanEnsureParams,
  PriceEnsureParams,
  ProductEnsureParams,
} from './schemas/sync'

type Query = {
  active?: string
  productId?: string
  itemId?: string
  planId?: string
  addonId?: string
}
function tenant(req: Request) {
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

export const catalogController = {
  async productsList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(await service.listProducts(tenant(req), active(q.active)))
  },
  async productsGet(req: Request, res: Response) {
    res.json(await service.getProduct(tenant(req), param(req, 'productId')))
  },
  async productsCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createProduct(
          tenant(req),
          validBody<ProductCreateParams>(req)
        )
      )
  },
  async productsUpdate(req: Request, res: Response) {
    res.json(
      await service.updateProduct(
        tenant(req),
        param(req, 'productId'),
        validBody<ProductUpdateParams>(req)
      )
    )
  },
  async productsDelete(req: Request, res: Response) {
    res.json(await service.deleteProduct(tenant(req), param(req, 'productId')))
  },
  async productsEnsure(req: Request, res: Response) {
    res.json(await service.ensureProduct(validBody<ProductEnsureParams>(req)))
  },
  async plansList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(
      await service.listPlans(tenant(req), active(q.active), q.productId)
    )
  },
  async integrationPlansList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(
      await service.listPlans(
        tenant(req),
        active(q.active),
        q.productId,
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/plans`
      )
    )
  },
  async plansGet(req: Request, res: Response) {
    res.json(await service.getPlan(tenant(req), param(req, 'planId')))
  },
  async plansCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createPlan(tenant(req), validBody<PlanCreateParams>(req))
      )
  },
  async plansUpdate(req: Request, res: Response) {
    res.json(
      await service.updatePlan(
        tenant(req),
        param(req, 'planId'),
        validBody<PlanUpdateParams>(req)
      )
    )
  },
  async plansClone(req: Request, res: Response) {
    res
      .status(200)
      .json(
        await service.clonePlan(
          tenant(req),
          param(req, 'planId'),
          validBody<PlanCloneParams>(req)
        )
      )
  },
  async plansDelete(req: Request, res: Response) {
    res.json(await service.deletePlan(tenant(req), param(req, 'planId')))
  },
  async plansEnsure(req: Request, res: Response) {
    res.json(await service.ensurePlan(validBody<PlanEnsureParams>(req)))
  },
  async pricesList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(
      await service.listPrices(tenant(req), active(q.active), {
        itemId: q.itemId,
        planId: q.planId,
        addonId: q.addonId,
      })
    )
  },
  async pricesGet(req: Request, res: Response) {
    res.json(await service.getPrice(tenant(req), param(req, 'priceId')))
  },
  async pricesCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createPrice(
          tenant(req),
          validBody<PriceCreateParams>(req)
        )
      )
  },
  async pricesUpdate(req: Request, res: Response) {
    res.json(
      await service.updatePrice(
        tenant(req),
        param(req, 'priceId'),
        validBody<PriceUpdateParams>(req)
      )
    )
  },
  async pricesDelete(req: Request, res: Response) {
    res.json(await service.deletePrice(tenant(req), param(req, 'priceId')))
  },
  async pricesEnsure(req: Request, res: Response) {
    res.json(await service.ensurePrice(validBody<PriceEnsureParams>(req)))
  },
  async addonsList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(
      await service.listAddons(tenant(req), active(q.active), q.productId)
    )
  },
  async addonsGet(req: Request, res: Response) {
    res.json(await service.getAddon(tenant(req), param(req, 'addonId')))
  },
  async addonsCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createAddon(
          tenant(req),
          validBody<AddonCreateParams>(req)
        )
      )
  },
  async addonsUpdate(req: Request, res: Response) {
    res.json(
      await service.updateAddon(
        tenant(req),
        param(req, 'addonId'),
        validBody<AddonUpdateParams>(req)
      )
    )
  },
  async addonsClone(req: Request, res: Response) {
    res
      .status(200)
      .json(
        await service.cloneAddon(
          tenant(req),
          param(req, 'addonId'),
          validBody<AddonCloneParams>(req)
        )
      )
  },
  async addonsDelete(req: Request, res: Response) {
    res.json(await service.deleteAddon(tenant(req), param(req, 'addonId')))
  },
  async addonsAssociations(req: Request, res: Response) {
    res.json(
      await service.saveAddonAssociations(
        tenant(req),
        param(req, 'addonId'),
        validBody<
          | AddonAssociationUpsertParams
          | { associations: AddonAssociationUpsertParams[] }
        >(req)
      )
    )
  },
  async itemsList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(await service.listItems(tenant(req), active(q.active)))
  },
  async itemsGet(req: Request, res: Response) {
    res.json(await service.getItem(tenant(req), param(req, 'itemId')))
  },
  async itemsCreate(req: Request, res: Response) {
    const result = await service.createItem(
      tenant(req),
      validBody<ItemCreateParams>(req)
    )
    res.status(200).json(result.resource)
  },
  async itemsUpdate(req: Request, res: Response) {
    res.json(
      await service.updateItem(
        tenant(req),
        param(req, 'itemId'),
        validBody<ItemUpdateParams>(req)
      )
    )
  },
  async itemsDelete(req: Request, res: Response) {
    res.json(await service.deleteItem(tenant(req), param(req, 'itemId')))
  },
  async integrationItemsList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(
      await service.listItems(
        tenant(req),
        active(q.active),
        sourceApp(req),
        `/api/v1/integrations/organizations/${param(req, 'organizationId')}/items`
      )
    )
  },
  async integrationItemsGet(req: Request, res: Response) {
    res.json(
      await service.getItem(tenant(req), param(req, 'itemId'), sourceApp(req))
    )
  },
  async integrationItemsCreate(req: Request, res: Response) {
    const body = validBody<
      ItemCreateParams & { sourceExternalReference?: string | null }
    >(req)
    const attribution = integrationAttribution(
      req,
      getPrincipal(req),
      body as Record<string, unknown>
    )
    const result = await service.createItem(tenant(req), body, attribution)
    res.status(result.replayed ? 200 : 201).json(result.resource)
  },
  async integrationItemsUpdate(req: Request, res: Response) {
    res.json(
      await service.updateItem(
        tenant(req),
        param(req, 'itemId'),
        validBody<ItemUpdateParams>(req),
        sourceApp(req)
      )
    )
  },
  async integrationItemsDelete(req: Request, res: Response) {
    res.json(
      await service.deleteItem(
        tenant(req),
        param(req, 'itemId'),
        sourceApp(req)
      )
    )
  },
  async priceListsList(req: Request, res: Response) {
    const q = validQuery<Query>(req)
    res.json(await service.listPriceLists(tenant(req), active(q.active)))
  },
  async priceListsGet(req: Request, res: Response) {
    res.json(await service.getPriceList(tenant(req), param(req, 'priceListId')))
  },
  async priceListsCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createPriceList(
          tenant(req),
          validBody<PriceListCreateParams>(req)
        )
      )
  },
  async priceListsUpdate(req: Request, res: Response) {
    res.json(
      await service.updatePriceList(
        tenant(req),
        param(req, 'priceListId'),
        validBody<PriceListUpdateParams>(req)
      )
    )
  },
  async priceListsDelete(req: Request, res: Response) {
    res.json(
      await service.deletePriceList(tenant(req), param(req, 'priceListId'))
    )
  },
  async priceListsResolve(req: Request, res: Response) {
    const body = validBody<PriceListResolveParams>(req)
    res.json(
      await service.resolvePriceList(
        tenant(req),
        param(req, 'priceListId'),
        body.priceId,
        body.quantity
      )
    )
  },
}
