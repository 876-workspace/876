import { prisma } from '../../db/index.js'
import type { ProjectMemberRow, ProjectRow } from './projects.serializers.js'

export type ListProjectsOptions = {
  status?: string
  lead?: string
  q?: string
  includeArchived?: boolean
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export type CountProjectsOptions = {
  status?: string
  lead?: string
  q?: string
  includeArchived?: boolean
}

function buildWhereClause(
  tenantId: string,
  options: {
    status?: string
    lead?: string
    q?: string
    includeArchived?: boolean
  }
) {
  return {
    tenantId,
    ...(options.status ? { status: options.status } : {}),
    ...(options.lead ? { leadUserId: options.lead } : {}),
    ...(options.q
      ? { name: { contains: options.q, mode: 'insensitive' as const } }
      : {}),
    ...(options.includeArchived ? {} : { archivedAt: null }),
  }
}

export async function list(
  tenantId: string,
  options: ListProjectsOptions
): Promise<ProjectRow[]> {
  const where = buildWhereClause(tenantId, options)
  const cursorId = options.startingAfter ?? options.endingBefore

  const rows = await prisma.project.findMany({
    where,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
    take: options.endingBefore ? -(options.limit + 1) : options.limit + 1,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return rows as ProjectRow[]
}

export async function count(
  tenantId: string,
  options: CountProjectsOptions
): Promise<number> {
  const where = buildWhereClause(tenantId, options)
  return prisma.project.count({ where })
}

export async function retrieve(
  tenantId: string,
  id: string
): Promise<ProjectRow | null> {
  const row = await prisma.project.findFirst({
    where: { tenantId, id },
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return row as ProjectRow | null
}

export async function retrieveByKey(
  tenantId: string,
  key: string
): Promise<ProjectRow | null> {
  const row = await prisma.project.findUnique({
    where: {
      tenantId_key: { tenantId, key },
    },
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return row as ProjectRow | null
}

export async function retrieveBySlug(
  tenantId: string,
  slug: string
): Promise<ProjectRow | null> {
  const row = await prisma.project.findUnique({
    where: {
      tenantId_slug: { tenantId, slug },
    },
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return row as ProjectRow | null
}

export async function create(params: {
  id: string
  tenantId: string
  name: string
  key: string
  slug: string
  description?: string | null
  leadUserId?: string | null
  status: string
  health: string
  startDate?: bigint | null
  targetDate?: bigint | null
  nextIssueNumber: number
  customerId?: string | null
  position: number
  createdAt: bigint
  updatedAt: bigint
}): Promise<ProjectRow> {
  const row = await prisma.project.create({
    data: params,
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return row as ProjectRow
}

export async function update(
  tenantId: string,
  id: string,
  params: {
    name?: string
    key?: string
    slug?: string
    description?: string | null
    leadUserId?: string | null
    status?: string
    health?: string
    startDate?: bigint | null
    targetDate?: bigint | null
    customerId?: string | null
    position?: number
    updatedAt: bigint
  }
): Promise<ProjectRow> {
  const row = await prisma.project.update({
    where: { id },
    data: params,
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return row as ProjectRow
}

export async function archive(
  tenantId: string,
  id: string,
  archivedAt: bigint
): Promise<ProjectRow> {
  const row = await prisma.project.update({
    where: { id },
    data: { archivedAt, updatedAt: archivedAt },
    include: {
      _count: {
        select: { members: true },
      },
    },
  })

  return row as ProjectRow
}

export async function hardDelete(tenantId: string, id: string): Promise<void> {
  await prisma.project.delete({
    where: { id },
  })
}

export async function listMembers(
  projectId: string
): Promise<ProjectMemberRow[]> {
  const rows = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })

  return rows as ProjectMemberRow[]
}

export async function retrieveMember(
  projectId: string,
  userId: string
): Promise<ProjectMemberRow | null> {
  const row = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  })

  return row as ProjectMemberRow | null
}

export async function createMember(params: {
  id: string
  projectId: string
  userId: string
  role: string
  createdAt: bigint
}): Promise<ProjectMemberRow> {
  const row = await prisma.projectMember.create({
    data: params,
  })

  return row as ProjectMemberRow
}

export async function removeMember(
  projectId: string,
  userId: string
): Promise<void> {
  await prisma.projectMember.delete({
    where: {
      projectId_userId: { projectId, userId },
    },
  })
}
