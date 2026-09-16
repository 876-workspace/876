import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

import { mapWikiPage, mapWikiRevision } from '../mappers'
import type { MentionMember } from './mention-input'
import { WikiPageForm } from './wiki-forms'
import { WikiPageView } from './wiki-page-view'
import { WikiRevisionList } from './wiki-revision-list'
import { WikiTree } from './wiki-tree'

async function loadMembers(orgId: string): Promise<readonly MentionMember[]> {
  const members = await loadMemberLabels(orgId)
  return Object.entries(members.labels).map(([userId, label]) => ({
    userId,
    label,
  }))
}

export async function ProjectWikiData({
  orgId,
  projectId,
  canEdit,
}: {
  orgId: string
  projectId: string
  canEdit: boolean
}) {
  const pagesResult = await projects.wiki.list(orgId, projectId, { limit: 100 })
  if (pagesResult.error || !pagesResult.data)
    return (
      <AppError
        title="Wiki pages could not be loaded"
        error={
          pagesResult.error ?? {
            code: 'projects/wiki-unavailable',
            message: 'Wiki pages could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div>
          <Link
            href={`/projects/${encodeURIComponent(projectId)}/wiki/new`}
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            New page
          </Link>
        </div>
      ) : null}
      <WikiTree
        pages={pagesResult.data.data.map(mapWikiPage)}
        hrefBase={`/projects/${encodeURIComponent(projectId)}/wiki`}
        currentPageId={null}
      />
    </div>
  )
}

export async function WikiPageData({
  orgId,
  projectId,
  pageRef,
  canEdit,
}: {
  orgId: string
  projectId: string
  pageRef: string
  canEdit: boolean
}) {
  const decoded = decodeURIComponent(pageRef)
  const [pageResult, pagesResult, membersResult] = await Promise.all([
    projects.wiki.retrieve(orgId, projectId, decoded),
    projects.wiki.list(orgId, projectId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])
  if (pageResult.error?.code === 'projects/wiki-page-not-found') notFound()
  if (pageResult.error || !pageResult.data)
    return (
      <AppError
        title="The wiki page could not be loaded"
        error={
          pageResult.error ?? {
            code: 'projects/wiki-unavailable',
            message: 'The wiki page could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const page = mapWikiPage(pageResult.data)
  const revisionsResult = await projects.wiki.listRevisions(
    orgId,
    projectId,
    pageResult.data.id,
    { limit: 50 }
  )
  const revisions = (revisionsResult.data?.data ?? []).map((revision, index) =>
    mapWikiRevision(
      revision,
      { index, total: pageResult.data.revisionCount },
      membersResult.labels
    )
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Wiki pages">
        <WikiTree
          pages={(pagesResult.data?.data ?? []).map(mapWikiPage)}
          hrefBase={`/projects/${encodeURIComponent(projectId)}/wiki`}
          currentPageId={page.id}
        />
      </aside>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Link
              href={`/projects/${encodeURIComponent(projectId)}/wiki/${encodeURIComponent(page.slug)}/edit`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Edit
            </Link>
          ) : null}
        </div>
        <WikiPageView page={page} bodyMarkdown={pageResult.data.body} />
        {canEdit ? (
          <WikiRevisionList
            projectId={projectId}
            pageRef={pageResult.data.id}
            pageTitle={page.title}
            revisions={revisions}
          />
        ) : null}
      </div>
    </div>
  )
}

export async function WikiNewPageData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const [pagesResult, members] = await Promise.all([
    projects.wiki.list(orgId, projectId, { limit: 100 }),
    loadMembers(orgId),
  ])
  return (
    <WikiPageForm
      projectId={projectId}
      pages={(pagesResult.data?.data ?? []).map((page) => ({
        id: page.id,
        title: page.title,
      }))}
      members={members}
    />
  )
}

export async function WikiEditPageData({
  orgId,
  projectId,
  pageRef,
}: {
  orgId: string
  projectId: string
  pageRef: string
}) {
  const decoded = decodeURIComponent(pageRef)
  const [pageResult, pagesResult, members] = await Promise.all([
    projects.wiki.retrieve(orgId, projectId, decoded),
    projects.wiki.list(orgId, projectId, { limit: 100 }),
    loadMembers(orgId),
  ])
  if (pageResult.error?.code === 'projects/wiki-page-not-found') notFound()
  if (pageResult.error || !pageResult.data)
    return (
      <AppError
        title="The wiki page could not be loaded"
        error={
          pageResult.error ?? {
            code: 'projects/wiki-unavailable',
            message: 'The wiki page could not be loaded.',
          }
        }
        variant="banner"
      />
    )
  return (
    <WikiPageForm
      projectId={projectId}
      page={mapWikiPage(pageResult.data)}
      pages={(pagesResult.data?.data ?? []).map((page) => ({
        id: page.id,
        title: page.title,
      }))}
      members={members}
    />
  )
}
