export interface ServiceNotification {
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
