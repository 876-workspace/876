import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import type { IntegrationAttribution } from '@/http/integration/idempotency'

import { requireItemVariantsEnabled } from './item-capabilities.service'
import { addons } from './repositories/addons'
import { items } from './repositories/items'
import { plans } from './repositories/plans'
import { priceLists } from './repositories/price-lists'
import { prices } from './repositories/prices'
import { products } from './repositories/products'
import type { ServiceResult } from './schemas/api'
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
import { findCatalogTenantBySlug } from './catalog.repository'
import { catalogList, serializeCatalog } from './catalog.serializers'

async function unwrap<T>(
  result: Awaited<ServiceResult<T>>,
  fallbackCode: string
): Promise<T> {
  if (result.error === null) return result.data
  const status = result.status ?? 500
  throw new AppHttpError({
    code:
      status === 404
        ? `${fallbackCode}/not-found`
        : status === 409
          ? `${fallbackCode}/conflict`
          : status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: status,
  })
}
function missing(kind: string): AppHttpError {
  return new AppHttpError({
    code: `${kind}/not-found`,
    message: `${kind.replace('_', ' ')} not found.`,
    httpStatus: 404,
  })
}
async function platformTenantId() {
  const slug = getSettings().platformTenantSlug
  if (!slug)
    throw new AppHttpError({
      code: 'billing/platform-tenant-unconfigured',
      message:
        'Set BILLING_PLATFORM_TENANT_SLUG to receive catalog mirror events.',
      httpStatus: 503,
    })
  const tenant = await findCatalogTenantBySlug(slug)
  if (!tenant)
    throw new AppHttpError({
      code: 'billing/platform-tenant-not-found',
      message: 'The configured platform Billing workspace was not found.',
      httpStatus: 503,
    })
  return tenant.id
}

export const catalogService = {
  async listProducts(tenantId: string, active?: boolean) {
    return catalogList(
      'product',
      await products.list(tenantId, active),
      '/api/v1/products'
    )
  },
  async getProduct(tenantId: string, id: string) {
    const row = await products.retrieve(tenantId, id)
    if (!row) throw missing('product')
    return serializeCatalog('product', row)
  },
  async createProduct(tenantId: string, body: ProductCreateParams) {
    return {
      object: 'product',
      ...(await unwrap(await products.create(tenantId, body), 'product')),
    }
  },
  async updateProduct(tenantId: string, id: string, body: ProductUpdateParams) {
    return {
      object: 'product',
      ...(await unwrap(await products.update(tenantId, id, body), 'product')),
    }
  },
  async deleteProduct(tenantId: string, id: string) {
    return {
      object: 'product',
      ...(await unwrap(await products.delete(tenantId, id), 'product')),
      deleted: true,
    }
  },
  async ensureProduct(body: ProductEnsureParams) {
    return {
      object: 'product',
      ...(await unwrap(
        await products.ensure(await platformTenantId(), body),
        'product'
      )),
    }
  },

  async listPlans(
    tenantId: string,
    active?: boolean,
    productId?: string,
    url = '/api/v1/plans'
  ) {
    return catalogList(
      'plan',
      await plans.list(tenantId, active, productId),
      url
    )
  },
  async getPlan(tenantId: string, id: string) {
    const row = await plans.retrieve(tenantId, id)
    if (!row) throw missing('plan')
    return serializeCatalog('plan', row)
  },
  async createPlan(tenantId: string, body: PlanCreateParams) {
    return {
      object: 'plan',
      ...(await unwrap(await plans.create(tenantId, body), 'plan')),
    }
  },
  async updatePlan(tenantId: string, id: string, body: PlanUpdateParams) {
    return {
      object: 'plan',
      ...(await unwrap(await plans.update(tenantId, id, body), 'plan')),
    }
  },
  async clonePlan(tenantId: string, id: string, body: PlanCloneParams) {
    return {
      object: 'plan',
      ...(await unwrap(await plans.clone(tenantId, id, body), 'plan')),
    }
  },
  async deletePlan(tenantId: string, id: string) {
    return {
      object: 'plan',
      ...(await unwrap(await plans.delete(tenantId, id), 'plan')),
      deleted: true,
    }
  },
  async ensurePlan(body: PlanEnsureParams) {
    return {
      object: 'plan',
      ...(await unwrap(
        await plans.ensure(await platformTenantId(), body),
        'plan'
      )),
    }
  },

  async listPrices(
    tenantId: string,
    active?: boolean,
    target?: { itemId?: string; planId?: string; addonId?: string }
  ) {
    return catalogList(
      'price',
      await prices.list(tenantId, active, target),
      '/api/v1/prices'
    )
  },
  async getPrice(tenantId: string, id: string) {
    const row = await prices.retrieve(tenantId, id)
    if (!row) throw missing('price')
    return serializeCatalog('price', row)
  },
  async createPrice(tenantId: string, body: PriceCreateParams) {
    return {
      object: 'price',
      ...(await unwrap(await prices.create(tenantId, body), 'price')),
    }
  },
  async updatePrice(tenantId: string, id: string, body: PriceUpdateParams) {
    return {
      object: 'price',
      ...(await unwrap(await prices.update(tenantId, id, body), 'price')),
    }
  },
  async deletePrice(tenantId: string, id: string) {
    return {
      object: 'price',
      ...(await unwrap(await prices.delete(tenantId, id), 'price')),
      deleted: true,
    }
  },
  async ensurePrice(body: PriceEnsureParams) {
    return {
      object: 'price',
      ...(await unwrap(
        await prices.ensure(await platformTenantId(), body),
        'price'
      )),
    }
  },

  async listAddons(tenantId: string, active?: boolean, productId?: string) {
    return catalogList(
      'addon',
      await addons.list(tenantId, active, productId),
      '/api/v1/addons'
    )
  },
  async getAddon(tenantId: string, id: string) {
    const row = await addons.retrieve(tenantId, id)
    if (!row) throw missing('addon')
    return serializeCatalog('addon', row)
  },
  async createAddon(tenantId: string, body: AddonCreateParams) {
    return {
      object: 'addon',
      ...(await unwrap(await addons.create(tenantId, body), 'addon')),
    }
  },
  async updateAddon(tenantId: string, id: string, body: AddonUpdateParams) {
    return {
      object: 'addon',
      ...(await unwrap(await addons.update(tenantId, id, body), 'addon')),
    }
  },
  async cloneAddon(tenantId: string, id: string, body: AddonCloneParams) {
    return {
      object: 'addon',
      ...(await unwrap(await addons.clone(tenantId, id, body), 'addon')),
    }
  },
  async deleteAddon(tenantId: string, id: string) {
    return {
      object: 'addon',
      ...(await unwrap(await addons.delete(tenantId, id), 'addon')),
      deleted: true,
    }
  },
  async saveAddonAssociations(
    tenantId: string,
    id: string,
    body:
      | AddonAssociationUpsertParams
      | { associations: AddonAssociationUpsertParams[] }
  ) {
    const rows = 'associations' in body ? body.associations : [body]
    return {
      object: 'addon_association_batch',
      ...(await unwrap(
        await addons.associations.upsertMany(tenantId, id, rows),
        'addon'
      )),
    }
  },

  async listItems(
    tenantId: string,
    active?: boolean,
    sourceAppId?: string,
    url = '/api/v1/items',
    q?: string,
    limit?: number
  ) {
    return catalogList(
      'item',
      await items.list(tenantId, active, sourceAppId, q, limit),
      url
    )
  },
  async getItem(tenantId: string, id: string, sourceAppId?: string) {
    const row = await items.retrieve(tenantId, id, sourceAppId)
    if (!row || (sourceAppId && row.sourceAppId !== sourceAppId))
      throw missing('item')
    return serializeCatalog('item', row)
  },
  async createItem(
    tenantId: string,
    body: ItemCreateParams,
    attribution?: IntegrationAttribution | null
  ) {
    if (body.variantMode === 'variant')
      await requireItemVariantsEnabled(tenantId)

    const result = await unwrap(
      await items.create(tenantId, body, attribution ?? undefined),
      'item'
    )
    return {
      resource: { object: 'item', id: result.id },
      replayed: result.replayed === true,
    }
  },
  async updateItem(
    tenantId: string,
    id: string,
    body: ItemUpdateParams,
    sourceAppId?: string
  ) {
    if (sourceAppId) await this.getItem(tenantId, id, sourceAppId)
    return {
      object: 'item',
      ...(await unwrap(await items.update(tenantId, id, body), 'item')),
    }
  },
  async deleteItem(tenantId: string, id: string, sourceAppId?: string) {
    if (sourceAppId) await this.getItem(tenantId, id, sourceAppId)
    return {
      object: 'item',
      ...(await unwrap(await items.delete(tenantId, id), 'item')),
      deleted: true,
    }
  },

  async listPriceLists(tenantId: string, active?: boolean) {
    return catalogList(
      'price_list',
      await priceLists.list(tenantId, active),
      '/api/v1/price-lists'
    )
  },
  async getPriceList(tenantId: string, id: string) {
    const row = await priceLists.retrieve(tenantId, id)
    if (!row) throw missing('price_list')
    return serializeCatalog('price_list', row)
  },
  async createPriceList(tenantId: string, body: PriceListCreateParams) {
    return {
      object: 'price_list',
      ...(await unwrap(await priceLists.create(tenantId, body), 'price_list')),
    }
  },
  async updatePriceList(
    tenantId: string,
    id: string,
    body: PriceListUpdateParams
  ) {
    return {
      object: 'price_list',
      ...(await unwrap(
        await priceLists.update(tenantId, id, body),
        'price_list'
      )),
    }
  },
  async deletePriceList(tenantId: string, id: string) {
    return {
      object: 'price_list',
      ...(await unwrap(await priceLists.delete(tenantId, id), 'price_list')),
      deleted: true,
    }
  },
  async resolvePriceList(
    tenantId: string,
    id: string,
    priceId: string,
    quantity: number
  ) {
    const row = await priceLists.resolveAmount(tenantId, priceId, quantity, id)
    if (!row) throw missing('price')
    return serializeCatalog('price_resolution', row)
  },
}
