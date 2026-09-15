import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type CycleRow = {
  id: string
  tenantId: string
  projectId: string | null
  number: number
  name: string
  description: string | null
  goal: string | null
  startsAt: Timestamp
  endsAt: Timestamp
  completedAt: Timestamp | null
  deletedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CycleStatus = 'upcoming' | 'active' | 'completed'

export type CycleProgress = {
  total: number
  completed: number
  estimatePoints: number
  completedEstimatePoints: number
}

export type CycleThroughput = {
  completedInWindow: number
  windowStart: number
  windowEnd: number
}

export type SerializedCycle = {
  object: 'cycle'
  id: string
  tenantId: string
  projectId: string | null
  number: number
  name: string
  description: string | null
  goal: string | null
  startsAt: number
  endsAt: number
  completedAt: number | null
  status: CycleStatus
  progress: CycleProgress
  throughput: CycleThroughput
  createdAt: number
  updatedAt: number
}

export function deriveCycleStatus(
  row: Pick<CycleRow, 'startsAt' | 'endsAt' | 'completedAt'>,
  nowSeconds?: number
): CycleStatus {
  if (row.completedAt !== null && row.completedAt !== undefined)
    return 'completed'
  const nowValue = nowSeconds ?? Math.floor(Date.now() / 1000)
  const startsAt = Number(row.startsAt)
  const endsAt = Number(row.endsAt)
  if (nowValue < startsAt) return 'upcoming'
  if (nowValue <= endsAt) return 'active'
  return 'completed'
}

export function serializeCycle(
  row: CycleRow,
  progress?: CycleProgress,
  throughputCount?: number
): SerializedCycle {
  const startsAt = fromDbUnixSeconds(row.startsAt)
  const endsAt = fromDbUnixSeconds(row.endsAt)
  const resolvedProgress = progress ?? {
    total: 0,
    completed: 0,
    estimatePoints: 0,
    completedEstimatePoints: 0,
  }
  return {
    object: 'cycle',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    number: row.number,
    name: row.name,
    description: row.description,
    goal: row.goal,
    startsAt,
    endsAt,
    completedAt: nullableFromDbUnixSeconds(row.completedAt),
    status: deriveCycleStatus(row),
    progress: resolvedProgress,
    throughput: {
      completedInWindow: throughputCount ?? 0,
      windowStart: startsAt,
      windowEnd: endsAt,
    },
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
