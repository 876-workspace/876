import type { Request, Response } from 'express'
import { listObject } from '@/http/envelope'
import { validBody, validParams } from '@/http/middleware/validate'
import * as service from './warehouses.service'
import type {
  CreateWarehouseBody,
  TenantIdParams,
  UpdateWarehouseBody,
  WarehouseParams,
} from './warehouses.schemas'

export async function listWarehouses(req: Request, res: Response) {
  const { tenantId } = validParams<TenantIdParams>(req)
  res.status(200).json(
    listObject({
      data: await service.listWarehouses(tenantId),
      hasMore: false,
      url: `/v1/tenants/${tenantId}/warehouses`,
    })
  )
}
export async function createWarehouse(req: Request, res: Response) {
  const { tenantId } = validParams<TenantIdParams>(req)
  res
    .status(201)
    .json(
      await service.createWarehouse(
        tenantId,
        validBody<CreateWarehouseBody>(req)
      )
    )
}
export async function retrieveWarehouse(req: Request, res: Response) {
  const { tenantId, id } = validParams<WarehouseParams>(req)
  res.status(200).json(await service.retrieveWarehouse(tenantId, id))
}
export async function updateWarehouse(req: Request, res: Response) {
  const { tenantId, id } = validParams<WarehouseParams>(req)
  res
    .status(200)
    .json(
      await service.updateWarehouse(
        tenantId,
        id,
        validBody<UpdateWarehouseBody>(req)
      )
    )
}
