import { z } from 'zod'

import { Request } from '../request'
import type { Runtime } from '../runtime'
import type {
  AddonAssociationBatchResult,
  AddonAssociationUpsertParams,
  AddonCreateParams,
  AddonUpdateParams,
  CatalogCloneParams,
  CatalogCreated,
  CatalogDeleted,
  CatalogResource,
  List,
  PlanCreateParams,
  PlanUpdateParams,
  PriceCreateParams,
  PriceListCreateParams,
  PriceListUpdateParams,
  PriceUpdateParams,
  ProductCreateParams,
  ProductUpdateParams,
  RequestOptions,
  ResolvedPrice,
} from '../types'

const CatalogResourceSchema = z.looseObject({
  object: z.enum(['product', 'plan', 'price', 'addon', 'price_list']),
  id: z.string().min(1),
}) satisfies z.ZodType<CatalogResource>

const CatalogCreatedSchema = z.strictObject({
  object: z.enum(['product', 'plan', 'price', 'addon', 'price_list']),
  id: z.string().min(1),
}) satisfies z.ZodType<CatalogCreated>

const AssociationCreatedSchema = z.strictObject({
  object: z.literal('plan_addon_association'),
  id: z.string().min(1),
}) satisfies z.ZodType<CatalogCreated>

const AssociationBatchSchema = z.strictObject({
  object: z.literal('plan_addon_association_batch'),
  id: z.string().min(1),
  updated: z.number().int().nonnegative(),
}) satisfies z.ZodType<AddonAssociationBatchResult>

const CatalogDeletedSchema = CatalogCreatedSchema.extend({
  deleted: z.literal(true),
}) satisfies z.ZodType<CatalogDeleted>

const CatalogListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(CatalogResourceSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<List<CatalogResource>>

const ResolvedPriceSchema = z.strictObject({
  object: z.literal('resolved_price'),
  currency: z.string(),
  amount: z.string(),
  price_list_id: z.string().nullable(),
}) satisfies z.ZodType<ResolvedPrice>

export function createCatalogResources(runtime: Runtime) {
  return {
    products: createCrudResource<ProductCreateParams, ProductUpdateParams>(
      runtime,
      'products'
    ),
    plans: {
      ...createCrudResource<PlanCreateParams, PlanUpdateParams>(
        runtime,
        'plans'
      ),
      clone(
        planId: string,
        params: CatalogCloneParams,
        options?: RequestOptions
      ) {
        return createClone(runtime, 'plans', planId, params, options)
      },
    },
    prices: createCrudResource<PriceCreateParams, PriceUpdateParams>(
      runtime,
      'prices'
    ),
    addons: {
      ...createCrudResource<AddonCreateParams, AddonUpdateParams>(
        runtime,
        'addons'
      ),
      clone(
        addonId: string,
        params: CatalogCloneParams,
        options?: RequestOptions
      ) {
        return createClone(runtime, 'addons', addonId, params, options)
      },
      upsertAssociation(
        addonId: string,
        params: AddonAssociationUpsertParams,
        options?: RequestOptions
      ) {
        return Request<CatalogCreated>(
          runtime,
          {
            method: 'PUT',
            path: `/api/v1/addons/${encodeURIComponent(addonId)}/associations`,
            body: params,
            signal: options?.signal,
          },
          AssociationCreatedSchema
        )
      },
      upsertAssociations(
        addonId: string,
        associations: AddonAssociationUpsertParams[],
        options?: RequestOptions
      ) {
        return Request<AddonAssociationBatchResult>(
          runtime,
          {
            method: 'PUT',
            path: `/api/v1/addons/${encodeURIComponent(addonId)}/associations`,
            body: { associations },
            signal: options?.signal,
          },
          AssociationBatchSchema
        )
      },
    },
    priceLists: {
      ...createCrudResource<PriceListCreateParams, PriceListUpdateParams>(
        runtime,
        'price-lists'
      ),
      resolve(
        priceListId: string,
        priceId: string,
        quantity: number,
        options?: RequestOptions
      ) {
        return Request<ResolvedPrice>(
          runtime,
          {
            method: 'POST',
            path: `/api/v1/price-lists/${encodeURIComponent(priceListId)}/resolve`,
            body: { priceId, quantity },
            signal: options?.signal,
          },
          ResolvedPriceSchema
        )
      },
    },
  }
}

function createCrudResource<TCreate, TUpdate>(
  runtime: Runtime,
  path: 'products' | 'plans' | 'prices' | 'addons' | 'price-lists'
) {
  return {
    list(options?: RequestOptions) {
      return Request<List<CatalogResource>>(
        runtime,
        { method: 'GET', path: `/api/v1/${path}`, signal: options?.signal },
        CatalogListSchema
      )
    },
    create(params: TCreate, options?: RequestOptions) {
      return Request<CatalogCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/${path}`,
          body: params,
          signal: options?.signal,
        },
        CatalogCreatedSchema
      )
    },
    retrieve(id: string, options?: RequestOptions) {
      return Request<CatalogResource>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/${path}/${encodeURIComponent(id)}`,
          signal: options?.signal,
        },
        CatalogResourceSchema
      )
    },
    update(id: string, params: TUpdate, options?: RequestOptions) {
      return Request<CatalogCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/${path}/${encodeURIComponent(id)}`,
          body: params,
          signal: options?.signal,
        },
        CatalogCreatedSchema
      )
    },
    delete(id: string, options?: RequestOptions) {
      return Request<CatalogDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/${path}/${encodeURIComponent(id)}`,
          signal: options?.signal,
        },
        CatalogDeletedSchema
      )
    },
  }
}

function createClone(
  runtime: Runtime,
  path: 'plans' | 'addons',
  id: string,
  params: CatalogCloneParams,
  options?: RequestOptions
) {
  return Request<CatalogCreated>(
    runtime,
    {
      method: 'POST',
      path: `/api/v1/${path}/${encodeURIComponent(id)}/clone`,
      body: params,
      signal: options?.signal,
    },
    CatalogCreatedSchema
  )
}
