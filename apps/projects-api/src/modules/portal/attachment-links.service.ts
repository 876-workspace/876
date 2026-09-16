import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as issues from '../issues/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import * as repository from './attachment-links.repository.js'
import type {
  CreateAttachmentBody,
  ListAttachmentsQuery,
  UpdateAttachmentBody,
} from './attachment-links.schemas.js'
import {
  serializeAttachmentLink,
  type SerializedAttachmentLink,
  type SerializedAttachmentTombstone,
} from './attachment-links.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedAttachmentLinks = {
  items: SerializedAttachmentLink[]
  hasMore: boolean
  totalCount: number | null
}

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveProject(tenantId: string, projectIdOrKey: string) {
  const project = await projects.resolveProject(tenantId, projectIdOrKey)
  if (!project)
    return { project: null, error: getError('projects/project-not-found') }
  return { project, error: null }
}

async function resolveLinks(
  tenantId: string,
  projectId: string,
  body: { issueId?: string | null; milestoneId?: string | null }
): Promise<ProjectsError | null> {
  if (body.issueId !== undefined && body.issueId !== null) {
    const issue = await issues.resolveIssue(tenantId, body.issueId)
    if (!issue || issue.deletedAt !== null || issue.projectId !== projectId)
      return getError('projects/issue-not-found')
  }
  if (body.milestoneId !== undefined && body.milestoneId !== null) {
    const milestone = await workStructure.resolveMilestoneById(
      tenantId,
      body.milestoneId
    )
    if (!milestone || milestone.projectId !== projectId)
      return getError('projects/milestone-not-found')
  }
  return null
}

export async function listAttachmentLinks(
  organizationId: string,
  projectIdOrKey: string,
  query: ListAttachmentsQuery
): Promise<ServiceResult<PaginatedAttachmentLinks>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listAttachmentLinks(
    tenant.id,
    projectResolution.project.id,
    {
      limit,
      startingAfter: query.starting_after,
      ...(query.issueId ? { issueId: query.issueId } : {}),
      ...(query.milestoneId ? { milestoneId: query.milestoneId } : {}),
    }
  )
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  return {
    data: {
      items: paged.map(serializeAttachmentLink),
      hasMore,
      totalCount: null,
    },
    error: null,
  }
}

export async function createAttachmentLink(
  organizationId: string,
  projectIdOrKey: string,
  body: CreateAttachmentBody
): Promise<ServiceResult<SerializedAttachmentLink>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }
  const project = projectResolution.project

  const linkError = await resolveLinks(tenant.id, project.id, body)
  if (linkError) return { data: null, error: linkError }

  const timestamp = now()
  const created = await repository.createAttachmentLink({
    id: generateId('attachmentLink'),
    tenantId: tenant.id,
    projectId: project.id,
    issueId: body.issueId ?? null,
    milestoneId: body.milestoneId ?? null,
    url: body.url,
    name: body.name ?? null,
    createdBy: body.createdBy ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeAttachmentLink(created), error: null }
}

export async function retrieveAttachmentLink(
  organizationId: string,
  projectIdOrKey: string,
  attachmentId: string
): Promise<ServiceResult<SerializedAttachmentLink>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const row = await repository.retrieveAttachmentLink(
    tenant.id,
    projectResolution.project.id,
    attachmentId
  )
  if (!row)
    return {
      data: null,
      error: getError('projects/attachment-link-not-found'),
    }
  return { data: serializeAttachmentLink(row), error: null }
}

export async function updateAttachmentLink(
  organizationId: string,
  projectIdOrKey: string,
  attachmentId: string,
  body: UpdateAttachmentBody
): Promise<ServiceResult<SerializedAttachmentLink>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const existing = await repository.retrieveAttachmentLink(
    tenant.id,
    projectResolution.project.id,
    attachmentId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/attachment-link-not-found'),
    }

  const updated = await repository.updateAttachmentLink(existing.id, {
    ...(body.url !== undefined ? { url: body.url } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    updatedAt: now(),
  })
  return { data: serializeAttachmentLink(updated), error: null }
}

export async function removeAttachmentLink(
  organizationId: string,
  projectIdOrKey: string,
  attachmentId: string
): Promise<ServiceResult<SerializedAttachmentTombstone>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const existing = await repository.retrieveAttachmentLink(
    tenant.id,
    projectResolution.project.id,
    attachmentId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/attachment-link-not-found'),
    }

  await repository.deleteAttachmentLink(existing.id)
  return {
    data: {
      object: 'projects.attachment-link',
      id: attachmentId,
      deleted: true,
    },
    error: null,
  }
}

export async function setAttachmentVisibility(
  organizationId: string,
  projectIdOrKey: string,
  attachmentId: string,
  clientVisible: boolean
): Promise<
  ServiceResult<{ object: string; id: string; clientVisible: boolean }>
> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const existing = await repository.retrieveAttachmentLink(
    tenant.id,
    projectResolution.project.id,
    attachmentId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/attachment-link-not-found'),
    }

  const updated = await repository.setAttachmentVisibility(
    existing.id,
    clientVisible,
    now()
  )
  return {
    data: {
      object: 'projects.attachment-link',
      id: updated.id,
      clientVisible: updated.clientVisible,
    },
    error: null,
  }
}
