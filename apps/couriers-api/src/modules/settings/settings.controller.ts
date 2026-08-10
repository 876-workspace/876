import type { Request, Response } from 'express'
import { listObject } from '@/http/envelope'
import { validBody, validParams } from '@/http/middleware/validate'
import * as service from './settings.service'
import type { ModuleParams, TenantParams, ToggleBody } from './settings.schemas'
export async function list(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res.status(200).json(
    listObject({
      data: await service.list(tenantId),
      hasMore: false,
      url: `/v1/tenants/${tenantId}/modules`,
    })
  )
}
export async function toggle(req: Request, res: Response) {
  const { tenantId, module } = validParams<ModuleParams>(req)
  const body = validBody<ToggleBody>(req)
  res.status(200).json(await service.toggle(tenantId, module, body.is_enabled))
}
