import type { Request, Response } from 'express'

import { deletedObject, listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import * as service from './addresses.service'
import type {
  AddressCreateBody,
  AddressParams,
  AddressUpdateBody,
  ListAddressesQuery,
  TenantIdParams,
} from './addresses.schemas'

export async function listAddresses(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<TenantIdParams>(req)
  const result = await service.listAddresses(
    tenantId,
    validQuery<ListAddressesQuery>(req)
  )
  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/addresses`,
    })
  )
}

export async function createAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<TenantIdParams>(req)
  res
    .status(201)
    .json(
      await service.createAddress(tenantId, validBody<AddressCreateBody>(req))
    )
}

export async function retrieveAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, id } = validParams<AddressParams>(req)
  res.status(200).json(await service.retrieveAddress(tenantId, id))
}

export async function updateAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, id } = validParams<AddressParams>(req)
  res
    .status(200)
    .json(
      await service.updateAddress(
        tenantId,
        id,
        validBody<AddressUpdateBody>(req)
      )
    )
}

export async function deleteAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, id } = validParams<AddressParams>(req)
  await service.deleteAddress(tenantId, id)
  res.status(200).json(deletedObject('address', id))
}
