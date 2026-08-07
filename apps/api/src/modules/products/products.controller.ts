import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateProductBody,
  ListProductsQuery,
  PriceCreateBody,
  ReplaceProductModulesBody,
  UpdatePriceBody,
  UpdateProductBody,
} from './products.schemas'
import * as service from './products.service'

/** Which keys the caller actually sent — clearing a field and leaving it alone
 * are different intents, and only the raw body distinguishes them. */
function providedKeys(req: Request): Set<string> {
  return new Set(Object.keys((req.body ?? {}) as object))
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await service.listProducts(validQuery<ListProductsQuery>(req)))
}

export async function retrieveProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { product_id } = validParams<{ product_id: string }>(req)

  res.status(200).json(await service.retrieveProduct(product_id))
}

export async function createProduct(
  req: Request,
  res: Response
): Promise<void> {
  res
    .status(201)
    .json(await service.createProduct(validBody<CreateProductBody>(req)))
}

export async function replaceProductModules(
  req: Request,
  res: Response
): Promise<void> {
  const { product_id } = validParams<{ product_id: string }>(req)
  const body = validBody<ReplaceProductModulesBody>(req)

  res
    .status(200)
    .json(await service.replaceProductModules(product_id, body.module_ids))
}

export async function updateProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { product_id } = validParams<{ product_id: string }>(req)
  const body = validBody<UpdateProductBody>(req)

  res
    .status(200)
    .json(await service.updateProduct(product_id, body, providedKeys(req)))
}

export async function archiveProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { product_id } = validParams<{ product_id: string }>(req)

  res.status(200).json(await service.archiveProduct(product_id))
}

export async function createPrice(req: Request, res: Response): Promise<void> {
  const { product_id } = validParams<{ product_id: string }>(req)
  const body = validBody<PriceCreateBody>(req)

  res.status(201).json(await service.createPrice(product_id, body))
}

export async function retrievePrice(
  req: Request,
  res: Response
): Promise<void> {
  const { product_id, price_id } = validParams<{
    product_id: string
    price_id: string
  }>(req)

  res.status(200).json(await service.retrievePrice(product_id, price_id))
}

export async function updatePrice(req: Request, res: Response): Promise<void> {
  const { product_id, price_id } = validParams<{
    product_id: string
    price_id: string
  }>(req)
  const body = validBody<UpdatePriceBody>(req)

  res
    .status(200)
    .json(
      await service.updatePrice(product_id, price_id, body, providedKeys(req))
    )
}

export async function archivePrice(req: Request, res: Response): Promise<void> {
  const { product_id, price_id } = validParams<{
    product_id: string
    price_id: string
  }>(req)

  res.status(200).json(await service.archivePrice(product_id, price_id))
}
