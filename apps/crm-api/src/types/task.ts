import type { RequestPriority } from './priority.js'

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type ReminderStatus = 'SCHEDULED' | 'SENT' | 'DISMISSED' | 'CANCELLED'

export interface RequestTask {
  object: 'request_task'
  id: string
  tenantId: string
  requestId: string
  title: string
  description: string | null
  status: TaskStatus
  priorityId: string
  priority: RequestPriority
  assigneeId: string | null
  dueAt: number | null
  completedAt: number | null
  completedBy: string | null
  sortOrder: number
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priorityId?: string
  assigneeId?: string | null
  dueAt?: number | null
  sortOrder?: number
  createdBy: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priorityId?: string
  assigneeId?: string | null
  dueAt?: number | null
  sortOrder?: number
  completedBy?: string | null
}

export interface RequestReminder {
  object: 'request_reminder'
  id: string
  tenantId: string
  requestId: string
  title: string
  note: string | null
  remindAt: number
  userId: string
  status: ReminderStatus
  sentAt: number | null
  dismissedAt: number | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface CreateReminderInput {
  title: string
  note?: string | null
  remindAt: number
  userId: string
  status?: ReminderStatus
  createdBy: string
}

export interface UpdateReminderInput {
  title?: string
  note?: string | null
  remindAt?: number
  userId?: string
  status?: ReminderStatus
}
