'use client'

import { request } from './request'

export interface NotificationDto {
  object: string
  id: string
  userId: string
  kind: string
  title: string
  subjectType: string | null
  subjectId: string | null
  readAt: number | null
  createdAt: number
}

export interface NotificationListDto {
  object: string
  data: NotificationDto[]
}

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
