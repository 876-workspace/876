import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type WikiPageRow = {
  id: string
  tenantId: string
  projectId: string
  slug: string
  title: string
  parentPageId: string | null
  deletedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type WikiRevisionRow = {
  id: string
  tenantId: string
  pageId: string
  title: string
  body: string
  authorUserId: string | null
  createdAt: bigint | number
}

export type SerializedWikiPage = {
  object: 'projects.wiki-page'
  id: string
  tenantId: string
  projectId: string
  slug: string
  title: string
  body: string
  parentPageId: string | null
  revisionCount: number
  createdAt: number
  updatedAt: number
}

export type SerializedWikiRevision = {
  object: 'projects.wiki-revision'
  id: string
  pageId: string
  title: string
  body: string
  authorUserId: string | null
  createdAt: number
}

export type SerializedWikiTombstone = {
  object: 'projects.wiki-page'
  id: string
  deleted: true
}

export function serializeWikiPage(
  row: WikiPageRow,
  body: string,
  revisionCount: number
): SerializedWikiPage {
  return {
    object: 'projects.wiki-page',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    slug: row.slug,
    title: row.title,
    body,
    parentPageId: row.parentPageId,
    revisionCount,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeWikiRevision(
  row: WikiRevisionRow
): SerializedWikiRevision {
  return {
    object: 'projects.wiki-revision',
    id: row.id,
    pageId: row.pageId,
    title: row.title,
    body: row.body,
    authorUserId: row.authorUserId,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}
