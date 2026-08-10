import type { Request, Response } from 'express'

import { deletedObject, listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import * as service from './customer-addresses.service'
import type {
  CreateCustomerAddressBody,
  CustomerAddressParams,
  ListCustomerAddressesQuery,
  TenantCustomerParams,
  UpdateCustomerAddressBody,
} from './customer-addresses.schemas'

export async function listCustomerAddresses(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, customerId } = validParams<TenantCustomerParams>(req)
  const result = await service.listCustomerAddresses(
    tenantId,
    customerId,
    validQuery<ListCustomerAddressesQuery>(req)
  )
  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/customers/${customerId}/addresses`,
    })
  )
}

export async function createCustomerAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, customerId } = validParams<TenantCustomerParams>(req)
  res
    .status(201)
    .json(
      await service.createCustomerAddress(
        tenantId,
        customerId,
        validBody<CreateCustomerAddressBody>(req)
      )
    )
}

export async function retrieveCustomerAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, customerId, id } = validParams<CustomerAddressParams>(req)
  res
    .status(200)
    .json(await service.retrieveCustomerAddress(tenantId, customerId, id))
}

export async function updateCustomerAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, customerId, id } = validParams<CustomerAddressParams>(req)
  res
    .status(200)
    .json(
      await service.updateCustomerAddress(
        tenantId,
        customerId,
        id,
        validBody<UpdateCustomerAddressBody>(req)
      )
    )
}

export async function deleteCustomerAddress(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId, customerId, id } = validParams<CustomerAddressParams>(req)
  await service.deleteCustomerAddress(tenantId, customerId, id)
  res.status(200).json(deletedObject('customer_address', id))
}
