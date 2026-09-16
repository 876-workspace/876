import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  notificationListSchema,
  notificationSchema,
  type RequestOptions,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/notifications`
}

export function createNotificationsResource(runtime: Runtime) {
  return {
    list(organizationId: string, userId: string, options: RequestOptions = {}) {
      const search = new URLSearchParams()
      search.set('userId', userId)
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}?${search.toString()}`,
          signal: options.signal,
        },
        notificationListSchema
      )
    },
    markRead(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/read`,
          signal: options.signal,
        },
        notificationSchema
      )
    },
  }
}
