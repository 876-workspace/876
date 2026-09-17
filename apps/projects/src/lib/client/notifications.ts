'use client'

import { request } from './request'

import type {
  NotificationDto,
  NotificationListDto,
} from '@/types/notifications'

export type { NotificationDto, NotificationListDto }

export const notificationsClient = {
  list() {
    return request<NotificationListDto>('/api/notifications')
  },
  markRead(notificationId: string) {
    return request<NotificationDto>(
      `/api/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'POST' }
    )
  },
}
