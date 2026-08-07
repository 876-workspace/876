import {
  listAuthAttemptsForDevice,
  type AuthAttempt,
  type ListAuthAttemptsQuery,
} from '@/modules/auth-attempts'
import { listObject, type ListObject } from '@/http/envelope'
import { errors } from '@/http/errors'

import * as repository from './devices.repository'
import type {
  Device,
  DeviceUser,
  ListDevicesQuery,
  UpdateDeviceBody,
} from './devices.schemas'
import { serializeDevice, serializeDeviceUser } from './devices.serializers'

/** The user device registry. */

async function requireDevice(deviceId: string) {
  const row = await repository.findById(deviceId)
  if (!row) throw errors.notFound('device')

  return row
}

export async function listDevices(
  query: ListDevicesQuery
): Promise<ListObject<Device>> {
  const { data, hasMore } = await repository.list(query)

  return listObject({
    data: data.map(serializeDevice),
    hasMore,
    url: '/devices',
  })
}

export async function listUserDevices(
  userId: string,
  query: ListDevicesQuery
): Promise<ListObject<Device>> {
  const { data, hasMore } = await repository.list(query, { user_id: userId })

  return listObject({
    data: data.map(serializeDevice),
    hasMore,
    url: `/users/${userId}/devices`,
  })
}

export async function retrieveDevice(deviceId: string): Promise<Device> {
  return serializeDevice(await requireDevice(deviceId))
}

/**
 * The attempt history for one device.
 *
 * The device is resolved first so an unknown id is a 404 rather than an empty
 * list — the two mean very different things when investigating an account.
 */
export async function listDeviceAttempts(
  deviceId: string,
  query: ListAuthAttemptsQuery
): Promise<ListObject<AuthAttempt>> {
  await requireDevice(deviceId)

  const { data, hasMore } = await listAuthAttemptsForDevice(deviceId, query)

  return listObject({ data, hasMore, url: `/devices/${deviceId}/attempts` })
}

/**
 * Every account seen on the same hardware.
 *
 * Devices are keyed by (user, fingerprint), so one physical device shared by two
 * accounts is two rows. This answers "who else signs in from this machine",
 * which is the question that matters when investigating abuse.
 */
export async function listDeviceUsers(
  deviceId: string
): Promise<ListObject<DeviceUser>> {
  const device = await requireDevice(deviceId)
  const rows = await repository.listByFingerprint(device.fingerprint)
  const data = rows.map(serializeDeviceUser)

  return listObject({
    data,
    hasMore: false,
    url: `/devices/${deviceId}/users`,
    totalCount: data.length,
  })
}

export async function updateDevice(
  deviceId: string,
  body: UpdateDeviceBody,
  actorId: string | null
): Promise<Device> {
  const row = await repository.update(deviceId, {
    label: body.label,
    trusted: body.trusted,
    blocked: body.blocked,
    blockReason: body.block_reason,
    actorId,
  })
  if (!row) throw errors.notFound('device')

  return serializeDevice(row)
}
