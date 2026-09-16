import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as collaboration from '../collaboration/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './wiki.repository.js'
import type {
  CreatePageBody,
  ListPagesQuery,
  UpdatePageBody,
} from './wiki.schemas.js'
import {
  serializeWikiPage,
  serializeWikiRevision,
  type SerializedWikiPage,
  type SerializedWikiRevision,
  type SerializedWikiTombstone,
} from './wiki.serializers.js'
import { slugifyTitle, wouldCreateCycle } from './wiki.slug.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedWikiPages = {
  items: SerializedWikiPage[]
  hasMore: boolean
  totalCount: number | null
}

export type PaginatedWikiRevisions = {
  items: SerializedWikiRevision[]
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

async function resolvePage(
  tenantId: string,
  projectId: string,
  pageRef: string
) {
  const byId = await repository.retrievePageById(tenantId, projectId, pageRef)
  if (byId) return { page: byId, error: null }
  const bySlug = await repository.retrievePageBySlug(
    tenantId,
    projectId,
    pageRef
  )
  if (bySlug) return { page: bySlug, error: null }
  return { page: null, error: getError('projects/wiki-page-not-found') }
}

async function pageDetail(page: {
  id: string
  tenantId: string
  projectId: string
  slug: string
  title: string
  parentPageId: string | null
  deletedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}): Promise<SerializedWikiPage> {
  const latest = await repository.latestRevision(page.id)
  const count = await repository.countRevisions(page.id)
  return serializeWikiPage(page, latest?.body ?? '', count)
}

async function resolveParent(
  tenantId: string,
  projectId: string,
  parentPageId: string | null | undefined,
  pageId: string | null
): Promise<ProjectsError | null> {
  if (parentPageId === undefined || parentPageId === null) return null
  const parent = await repository.retrievePageById(
    tenantId,
    projectId,
    parentPageId
  )
  if (!parent) return getError('projects/wiki-page-not-found')
  if (pageId) {
    const links = await repository.listAllPageLinks(tenantId, projectId)
    if (wouldCreateCycle(links, pageId, parentPageId))
      return getError('projects/wiki-invalid-parent')
  }
  return null
}

export async function listPages(
  organizationId: string,
  projectIdOrKey: string,
  query: ListPagesQuery
): Promise<ServiceResult<PaginatedWikiPages>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listPages(
    tenant.id,
    projectResolution.project.id,
    {
      limit,
      startingAfter: query.starting_after,
      ...(query.parentPageId !== undefined
        ? { parentPageId: query.parentPageId }
        : {}),
    }
  )
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  const items: SerializedWikiPage[] = []
  for (const row of paged) items.push(await pageDetail(row))
  return { data: { items, hasMore, totalCount: null }, error: null }
}

export async function createPage(
  organizationId: string,
  projectIdOrKey: string,
  body: CreatePageBody
): Promise<ServiceResult<SerializedWikiPage>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }
  const project = projectResolution.project

  const slug = body.slug ?? slugifyTitle(body.title)
  const slugTaken = await repository.retrievePageBySlug(
    tenant.id,
    project.id,
    slug
  )
  if (slugTaken)
    return { data: null, error: getError('projects/wiki-page-slug-taken') }

  const parentError = await resolveParent(
    tenant.id,
    project.id,
    body.parentPageId ?? null,
    null
  )
  if (parentError) return { data: null, error: parentError }

  const timestamp = now()
  const created = await repository.createPage({
    id: generateId('wikiPage'),
    tenantId: tenant.id,
    projectId: project.id,
    slug,
    title: body.title,
    parentPageId: body.parentPageId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await repository.createRevision({
    id: generateId('wikiRevision'),
    tenantId: tenant.id,
    pageId: created.id,
    title: body.title,
    body: body.body,
    authorUserId: body.authorUserId ?? null,
    createdAt: timestamp,
  })

  const mentioned = collaboration.mentionedUserIds(
    `${body.title}\n${body.body}`,
    body.authorUserId ?? null
  )
  const follows: Array<{
    subjectType: string
    subjectId: string
    userId: string
  }> = []
  if (body.authorUserId)
    follows.push({
      subjectType: 'project',
      subjectId: project.id,
      userId: body.authorUserId,
    })
  for (const userId of mentioned)
    follows.push({ subjectType: 'project', subjectId: project.id, userId })
  await collaboration.ensureFollows(repository.wikiWriter(), tenant.id, follows)
  await collaboration.notifyMentionedUsers({
    tenantId: tenant.id,
    userIds: mentioned,
    subjectType: 'wiki-page',
    subjectId: created.id,
    title: `You were mentioned in ${body.title}`,
  })

  return { data: await pageDetail(created), error: null }
}

export async function retrievePage(
  organizationId: string,
  projectIdOrKey: string,
  pageRef: string
): Promise<ServiceResult<SerializedWikiPage>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolvePage(
    tenant.id,
    projectResolution.project.id,
    pageRef
  )
  if (resolution.error) return { data: null, error: resolution.error }
  return { data: await pageDetail(resolution.page), error: null }
}

export async function updatePage(
  organizationId: string,
  projectIdOrKey: string,
  pageRef: string,
  body: UpdatePageBody
): Promise<ServiceResult<SerializedWikiPage>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolvePage(
    tenant.id,
    projectResolution.project.id,
    pageRef
  )
  if (resolution.error) return { data: null, error: resolution.error }
  const page = resolution.page

  if (body.parentPageId !== undefined) {
    const parentError = await resolveParent(
      tenant.id,
      projectResolution.project.id,
      body.parentPageId,
      page.id
    )
    if (parentError) return { data: null, error: parentError }
  }

  const nextTitle = body.title ?? page.title
  const contentChanged =
    body.title !== undefined || body.body !== undefined;
  const timestamp = now()

  const updated = await repository.updatePage(page.id, {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.parentPageId !== undefined
      ? { parentPageId: body.parentPageId }
      : {}),
    updatedAt: timestamp,
  })

  if (contentChanged) {
    const latest = await repository.latestRevision(page.id)
    await repository.createRevision({
      id: generateId('wikiRevision'),
      tenantId: tenant.id,
      pageId: page.id,
      title: nextTitle,
      body: body.body ?? latest?.body ?? '',
      authorUserId: body.authorUserId ?? null,
      createdAt: timestamp,
    })
  }

  if (body.body !== undefined) {
    const mentioned = collaboration.mentionedUserIds(
      body.body,
      body.authorUserId ?? null
    )
    const follows = mentioned.map((userId) => ({
      subjectType: 'project',
      subjectId: projectResolution.project.id,
      userId,
    }))
    await collaboration.ensureFollows(
      repository.wikiWriter(),
      tenant.id,
      follows
    )
    await collaboration.notifyMentionedUsers({
      tenantId: tenant.id,
      userIds: mentioned,
      subjectType: 'wiki-page',
      subjectId: page.id,
      title: `You were mentioned in ${nextTitle}`,
    })
  }

  return { data: await pageDetail(updated), error: null }
}

export async function removePage(
  organizationId: string,
  projectIdOrKey: string,
  pageRef: string
): Promise<ServiceResult<SerializedWikiTombstone>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolvePage(
    tenant.id,
    projectResolution.project.id,
    pageRef
  )
  if (resolution.error) return { data: null, error: resolution.error }

  if (process.env.DELETION_MODE === 'hard')
    await repository.hardDeletePage(resolution.page.id)
  else await repository.softDeletePage(resolution.page.id, now())

  return {
    data: { object: 'projects.wiki-page', id: resolution.page.id, deleted: true },
    error: null,
  }
}

export async function listRevisions(
  organizationId: string,
  projectIdOrKey: string,
  pageRef: string,
  query: { limit?: number; starting_after?: string }
): Promise<ServiceResult<PaginatedWikiRevisions>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolvePage(
    tenant.id,
    projectResolution.project.id,
    pageRef
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listRevisions(resolution.page.id, {
    limit,
    startingAfter: query.starting_after,
  })
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  return {
    data: {
      items: paged.map(serializeWikiRevision),
      hasMore,
      totalCount: null,
    },
    error: null,
  }
}

export async function retrieveRevision(
  organizationId: string,
  projectIdOrKey: string,
  pageRef: string,
  revisionId: string
): Promise<ServiceResult<SerializedWikiRevision>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolvePage(
    tenant.id,
    projectResolution.project.id,
    pageRef
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const revision = await repository.retrieveRevision(
    resolution.page.id,
    revisionId
  )
  if (!revision)
    return {
      data: null,
      error: getError('projects/wiki-revision-not-found'),
    }
  return { data: serializeWikiRevision(revision), error: null }
}

export async function restoreRevision(
  organizationId: string,
  projectIdOrKey: string,
  pageRef: string,
  revisionId: string,
  authorUserId?: string | null
): Promise<ServiceResult<SerializedWikiPage>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolvePage(
    tenant.id,
    projectResolution.project.id,
    pageRef
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const revision = await repository.retrieveRevision(
    resolution.page.id,
    revisionId
  )
  if (!revision)
    return {
      data: null,
      error: getError('projects/wiki-revision-not-found'),
    }

  const timestamp = now()
  await repository.createRevision({
    id: generateId('wikiRevision'),
    tenantId: tenant.id,
    pageId: resolution.page.id,
    title: revision.title,
    body: revision.body,
    authorUserId: authorUserId ?? null,
    createdAt: timestamp,
  })
  const updated = await repository.updatePage(resolution.page.id, {
    title: revision.title,
    updatedAt: timestamp,
  })

  return { data: await pageDetail(updated), error: null }
}
