import type { Request, Response } from 'express'
import { listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import * as s from './kiosk.service'
import type {
  CollectBody,
  CollectionParams,
  DeviceParams,
  EnrollBody,
  LookupQuery,
  PickupChallengeParams,
  CreatePickupChallengeBody,
  TenantParams,
} from './kiosk.schemas'
export async function enroll(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res.status(201).json(await s.enroll(tenantId, validBody<EnrollBody>(req)))
}
export async function listDevices(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res.status(200).json(
    listObject({
      data: await s.listDevices(tenantId),
      hasMore: false,
      url: `/v1/tenants/${tenantId}/kiosk-devices`,
    })
  )
}
export async function revoke(req: Request, res: Response) {
  const { tenantId, id } = validParams<DeviceParams>(req)
  res.status(200).json(await s.revoke(tenantId, id))
}
export async function lookup(req: Request, res: Response) {
  if (!req.kioskDevice) throw new Error('Kiosk principal missing.')
  res.status(200).json(
    listObject({
      data: await s.lookup(req.kioskDevice, validQuery<LookupQuery>(req)),
      hasMore: false,
      url: '/v1/kiosk/packages/lookup',
    })
  )
}
export async function collect(req: Request, res: Response) {
  if (!req.kioskDevice) throw new Error('Kiosk principal missing.')
  const { id } = validParams<CollectionParams>(req)
  res
    .status(200)
    .json(
      await s.collect(
        req.kioskDevice,
        id,
        validBody<CollectBody>(req).pickup_code
      )
    )
}
export async function createPickupChallenge(req: Request, res: Response) {
  const { tenantId, packageId } = validParams<PickupChallengeParams>(req)
  res
    .status(201)
    .json(
      await s.createPickupChallenge(
        tenantId,
        packageId,
        validBody<CreatePickupChallengeBody>(req)
      )
    )
}
