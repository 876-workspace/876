import type { AdminDevice } from '@876/admin'

import { request } from './request'

type DeviceUpdateParams = {
  label?: string | null
  trusted?: boolean
  blocked?: boolean
  blockReason?: string | null
}

const update = (deviceId: string, params: DeviceUpdateParams) =>
  request<AdminDevice>(`/api/devices/${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const devices = { update }
