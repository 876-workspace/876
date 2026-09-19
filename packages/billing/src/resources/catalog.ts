import { z } from 'zod'

import { Request } from '../request'
import type { Runtime } from '../runtime'
import type {
  AddonAssociationBatchResult,
  AddonAssociationUpsertParams,
  AddonCreateParams,
  AddonListParams,
  AddonUpdateParams,
  CatalogCloneParams,
  CatalogCreated,
  CatalogDeleted,
  CatalogResource,
  List,
  PlanCreateParams,
  PlanListParams,
  PlanUpdateParams,
  PriceCreateParams,
  PriceListCreateParams,
  PriceListListParams,
  PriceListUpdateParams,
  PriceQueryParams,
  PriceUpdateParams,
  ProductCreateParams,
  ProductListParams,
  ProductUpdateParams,
  RequestOptions,
  ResolvedPrice,
} from '../types'
import type { TransportRequest } from '../transport'

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
    products: createCrudResource<
      ProductCreateParams,
      ProductUpdateParams,
      ProductListParams
    >(runtime, 'products', (params) => ({ active: params.active })),
    plans: {
      ...createCrudResource<PlanCreateParams, PlanUpdateParams, PlanListParams>(
        runtime,
        'plans',
        (params) => ({
          active: params.active,
          productId: params.productId,
        })
      ),
      clone(
        planId: string,
        params: CatalogCloneParams,
        options?: RequestOptions
      ) {
        return createClone(runtime, 'plans', planId, params, options)
      },
    },
    prices: createCrudResource<
      PriceCreateParams,
      PriceUpdateParams,
      PriceQueryParams
    >(runtime, 'prices', (params) => ({
      active: params.active,
      addonId: params.addonId,
      itemId: params.itemId,
      planId: params.planId,
    })),
    addons: {
      ...createCrudResource<
        AddonCreateParams,
        AddonUpdateParams,
        AddonListParams
      >(runtime, 'addons', (params) => ({
        active: params.active,
        productId: params.productId,
      })),
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
      ...createCrudResource<
        PriceListCreateParams,
        PriceListUpdateParams,
        PriceListListParams
      >(runtime, 'price-lists', (params) => ({ active: params.active })),
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

function createCrudResource<TCreate, TUpdate, TListParams extends object>(
  runtime: Runtime,
  path: 'products' | 'plans' | 'prices' | 'addons' | 'price-lists',
  toQuery?: (params: TListParams) => TransportRequest['query']
) {
  return {
    list(params: TListParams = {} as TListParams, options?: RequestOptions) {
      return Request<List<CatalogResource>>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/${path}`,
          query: toQuery?.(params),
          signal: options?.signal,
        },
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
