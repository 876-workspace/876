import { prisma } from '../../db/index.js'
import type { WikiPageRow, WikiRevisionRow } from './wiki.serializers.js'

export async function listPages(
  tenantId: string,
  projectId: string,
  options: {
    limit: number
    startingAfter?: string
    parentPageId?: string | null
  }
): Promise<WikiPageRow[]> {
  const rows = await prisma.wikiPage.findMany({
    where: {
      tenantId,
      projectId,
      deletedAt: null,
      ...(options.parentPageId !== undefined
        ? { parentPageId: options.parentPageId }
        : {}),
    },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: { updatedAt: 'desc' },
  })
  return rows as WikiPageRow[]
}

export async function listAllPageLinks(
  tenantId: string,
  projectId: string
): Promise<Array<{ id: string; parentPageId: string | null }>> {
  return prisma.wikiPage.findMany({
    where: { tenantId, projectId, deletedAt: null },
    select: { id: true, parentPageId: true },
  })
}

export async function retrievePageById(
  tenantId: string,
  projectId: string,
  id: string
): Promise<WikiPageRow | null> {
  const row = await prisma.wikiPage.findFirst({
    where: { tenantId, projectId, id, deletedAt: null },
  })
  return (row ?? null) as WikiPageRow | null
}

export async function retrievePageBySlug(
  tenantId: string,
  projectId: string,
  slug: string
): Promise<WikiPageRow | null> {
  const row = await prisma.wikiPage.findFirst({
    where: { tenantId, projectId, slug, deletedAt: null },
  })
  return (row ?? null) as WikiPageRow | null
}

export async function createPage(params: {
  id: string
  tenantId: string
  projectId: string
  slug: string
  title: string
  parentPageId: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<WikiPageRow> {
  const row = await prisma.wikiPage.create({ data: params })
  return row as WikiPageRow
}

export async function updatePage(
  id: string,
  params: {
    title?: string
    parentPageId?: string | null
    updatedAt: bigint
  }
): Promise<WikiPageRow> {
  const row = await prisma.wikiPage.update({ where: { id }, data: params })
  return row as WikiPageRow
}

export async function softDeletePage(
  id: string,
  deletedAt: bigint
): Promise<void> {
  await prisma.wikiPage.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function hardDeletePage(id: string): Promise<void> {
  await prisma.wikiPage.delete({ where: { id } })
}

export async function createRevision(params: {
  id: string
  tenantId: string
  pageId: string
  title: string
  body: string
  authorUserId: string | null
  createdAt: bigint
}): Promise<WikiRevisionRow> {
  const row = await prisma.wikiRevision.create({ data: params })
  return row as WikiRevisionRow
}

export async function latestRevision(
  pageId: string
): Promise<WikiRevisionRow | null> {
  const row = await prisma.wikiRevision.findFirst({
    where: { pageId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  return (row ?? null) as WikiRevisionRow | null
}

export async function countRevisions(pageId: string): Promise<number> {
  return prisma.wikiRevision.count({ where: { pageId } })
}

export async function listRevisions(
  pageId: string,
  options: { limit: number; startingAfter?: string }
): Promise<WikiRevisionRow[]> {
  const rows = await prisma.wikiRevision.findMany({
    where: { pageId },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  return rows as WikiRevisionRow[]
}

export async function retrieveRevision(
  pageId: string,
  id: string
): Promise<WikiRevisionRow | null> {
  const row = await prisma.wikiRevision.findFirst({
    where: { pageId, id },
  })
  return (row ?? null) as WikiRevisionRow | null
}

/**
 * Writer handle for cross-cutting follow writes. See the matching helper
 * in the discussions repository for why this exists.
 */
export function wikiWriter(): Pick<typeof prisma, 'follower'> {
  return prisma
}
