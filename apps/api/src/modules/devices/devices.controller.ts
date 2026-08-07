import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import type { ListAuthAttemptsQuery } from '@/modules/auth-attempts'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type { ListDevicesQuery, UpdateDeviceBody } from './devices.schemas'
import * as service from './devices.service'

export async function listDevices(req: Request, res: Response): Promise<void> {
  res.status(200).json(await service.listDevices(validQuery(req)))
}

export async function retrieveDevice(
  req: Request,
  res: Response
): Promise<void> {
  const { device_id } = validParams<{ device_id: string }>(req)

  res.status(200).json(await service.retrieveDevice(device_id))
}

export async function listDeviceAttempts(
  req: Request,
  res: Response
): Promise<void> {
  const { device_id } = validParams<{ device_id: string }>(req)
  const query = validQuery<ListAuthAttemptsQuery>(req)

  res.status(200).json(await service.listDeviceAttempts(device_id, query))
}

export async function listDeviceUsers(
  req: Request,
  res: Response
): Promise<void> {
  const { device_id } = validParams<{ device_id: string }>(req)

  res.status(200).json(await service.listDeviceUsers(device_id))
}

export async function updateDevice(req: Request, res: Response): Promise<void> {
  const { device_id } = validParams<{ device_id: string }>(req)
  const body = validBody<UpdateDeviceBody>(req)

  res
    .status(200)
    .json(await service.updateDevice(device_id, body, getPrincipal(req).userId))
}

export async function listUserDevices(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = validParams<{ user_id: string }>(req)
  const query = validQuery<ListDevicesQuery>(req)

  res.status(200).json(await service.listUserDevices(user_id, query))
}
