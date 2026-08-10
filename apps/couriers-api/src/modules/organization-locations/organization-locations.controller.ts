import type { Request, Response } from 'express'

import { validBody, validParams } from '@/http/middleware/validate'

import * as service from './organization-locations.service'
import type {
  SyncOrganizationLocationBody,
  TenantIdParams,
} from './organization-locations.schemas'

export async function reconcileOrganizationLocations(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<TenantIdParams>(req)
  res.status(200).json(await service.reconcileOrganizationLocations(tenantId))
}

export async function syncOrganizationLocation(
  req: Request,
  res: Response
): Promise<void> {
  const { tenantId } = validParams<TenantIdParams>(req)
  res
    .status(200)
    .json(
      await service.syncOrganizationLocation(
        tenantId,
        validBody<SyncOrganizationLocationBody>(req)
      )
    )
}
