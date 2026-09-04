import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

export type ProjectRow = {
  id: string
  tenantId: string
  name: string
  key: string
  slug: string
  description: string | null
  leadUserId: string | null
  status: string
  health: string
  startDate: bigint | number | null
  targetDate: bigint | number | null
  nextIssueNumber: number
  customerId: string | null
  defaultWorkItemTypeId?: string | null
  position: number
  archivedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
  _count?: {
    members?: number
  }
}

export type ProjectMemberRow = {
  id: string
  projectId: string
  userId: string
  role: string
  createdAt: bigint | number
}

export type SerializedProject = {
  object: 'projects.project'
  id: string
  tenantId: string
  name: string
  key: string
  slug: string
  description: string | null
  leadUserId: string | null
  status: string
  health: string
  startDate: number | null
  targetDate: number | null
  nextIssueNumber: number
  customerId: string | null
  position: number
  archivedAt: number | null
  createdAt: number
  updatedAt: number
  memberCount: number
}

export type SerializedProjectTombstone = {
  object: 'projects.project'
  id: string
  deleted: true
}

export type SerializedProjectMember = {
  object: 'projects.project-member'
  id: string
  projectId: string
  userId: string
  role: string
  createdAt: number
}

export type SerializedProjectMemberTombstone = {
  object: 'projects.project-member'
  id: string
  deleted: true
}

export function serializeProject(
  row: ProjectRow,
  memberCount?: number
): SerializedProject {
  const count =
    memberCount !== undefined ? memberCount : (row._count?.members ?? 0)

  return {
    object: 'projects.project',
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    key: row.key,
    slug: row.slug,
    description: row.description,
    leadUserId: row.leadUserId,
    status: row.status,
    health: row.health,
    startDate: nullableFromDbUnixSeconds(row.startDate),
    targetDate: nullableFromDbUnixSeconds(row.targetDate),
    nextIssueNumber: row.nextIssueNumber,
    customerId: row.customerId,
    position: row.position,
    archivedAt: nullableFromDbUnixSeconds(row.archivedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
    memberCount: count,
  }
}

export function serializeMember(
  row: ProjectMemberRow
): SerializedProjectMember {
  return {
    object: 'projects.project-member',
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    role: row.role,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}
