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
  const { productId } = validParams<{ productId: string }>(req)

  res.status(200).json(await service.retrieveProduct(productId))
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
  const { productId } = validParams<{ productId: string }>(req)
  const body = validBody<ReplaceProductModulesBody>(req)

  res
    .status(200)
    .json(await service.replaceProductModules(productId, body.module_ids))
}

export async function updateProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { productId } = validParams<{ productId: string }>(req)
  const body = validBody<UpdateProductBody>(req)

  res
    .status(200)
    .json(await service.updateProduct(productId, body, providedKeys(req)))
}

export async function archiveProduct(
  req: Request,
  res: Response
): Promise<void> {
  const { productId } = validParams<{ productId: string }>(req)

  res.status(200).json(await service.archiveProduct(productId))
}

export async function createPrice(req: Request, res: Response): Promise<void> {
  const { productId } = validParams<{ productId: string }>(req)
  const body = validBody<PriceCreateBody>(req)

  res.status(201).json(await service.createPrice(productId, body))
}

export async function retrievePrice(
  req: Request,
  res: Response
): Promise<void> {
  const { productId, priceId } = validParams<{
    productId: string
    priceId: string
  }>(req)

  res.status(200).json(await service.retrievePrice(productId, priceId))
}

export async function updatePrice(req: Request, res: Response): Promise<void> {
  const { productId, priceId } = validParams<{
    productId: string
    priceId: string
  }>(req)
  const body = validBody<UpdatePriceBody>(req)

  res
    .status(200)
    .json(
      await service.updatePrice(productId, priceId, body, providedKeys(req))
    )
}

export async function archivePrice(req: Request, res: Response): Promise<void> {
  const { productId, priceId } = validParams<{
    productId: string
    priceId: string
  }>(req)

  res.status(200).json(await service.archivePrice(productId, priceId))
}
