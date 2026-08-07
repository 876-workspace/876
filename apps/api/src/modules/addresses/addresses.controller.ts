import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateAddressBody,
  ListAddressesQuery,
  UpdateAddressBody,
} from './addresses.schemas'
import * as service from './addresses.service'

export async function listAddresses(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListAddressesQuery>(req)

  res.status(200).json(await service.listAddresses(query))
}

export async function createAddress(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<CreateAddressBody>(req)

  res.status(201).json(await service.createAddress(body))
}

export async function retrieveAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { address_id } = validParams<{ address_id: string }>(req)

  res.status(200).json(await service.retrieveAddress(address_id))
}

export async function updateAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { address_id } = validParams<{ address_id: string }>(req)
  const body = validBody<UpdateAddressBody>(req)

  res.status(200).json(await service.updateAddress(address_id, body))
}

export async function deleteAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { address_id } = validParams<{ address_id: string }>(req)

  res.status(200).json(await service.deleteAddress(address_id))
}
