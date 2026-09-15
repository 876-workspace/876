import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type TaskListRow = {
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  name: string
  description: string | null
  ownerUserId: string | null
  startDate: Timestamp | null
  targetDate: Timestamp | null
  position: number
  archivedAt: Timestamp | null
  deletedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TaskListProgress = {
  total: number
  completed: number
}

export type SerializedTaskList = {
  object: 'task-list'
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  name: string
  description: string | null
  ownerUserId: string | null
  startDate: number | null
  targetDate: number | null
  position: number
  archivedAt: number | null
  progress: TaskListProgress
  createdAt: number
  updatedAt: number
}

export function serializeTaskList(
  row: TaskListRow,
  progress?: TaskListProgress
): SerializedTaskList {
  return {
    object: 'task-list',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    milestoneId: row.milestoneId,
    name: row.name,
    description: row.description,
    ownerUserId: row.ownerUserId,
    startDate: nullableFromDbUnixSeconds(row.startDate),
    targetDate: nullableFromDbUnixSeconds(row.targetDate),
    position: row.position,
    archivedAt: nullableFromDbUnixSeconds(row.archivedAt),
    progress: progress ?? { total: 0, completed: 0 },
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
