import { WikiTree } from '@876/projects-ui/collaboration/wiki-tree'
import { WikiPageView } from '@876/projects-ui/collaboration/wiki-page-view'
import { AppError } from '@876/ui/app-error'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  toUiWikiPage,
  toUiWikiRevision,
} from '../collaboration-mappers'
import { projects } from '@/lib/clients/projects'

import { ReadOnlyWikiRevisionList } from './read-only-wiki-revisions'

/**
 * The data half of the project Wiki tab, shared by every host. Read-only:
 * the page tree with links resolved against the host's Projects root. No
 * new-page affordance.
 */
export async function ProjectWikiData({
  organizationId,
  base,
  projectId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
}) {
  const [projectResult, pagesResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.wiki.list(organizationId, projectId, { limit: 100 }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (pagesResult.error || !pagesResult.data) {
    return (
      <AppError
        title="Wiki pages could not be loaded"
        error={pagesResult.error}
        variant="banner"
        showCode
      />
    )
  }

  return (
    <WikiTree
      pages={pagesResult.data.data.map(toUiWikiPage)}
      hrefBase={`${base}/projects/${encodeURIComponent(projectId)}/wiki`}
      currentPageId={null}
    />
  )
}

/**
 * The data half of the wiki page record, shared by every host. Read-only:
 * the tree alongside the page body and its revisions without restore
 * affordances. The shared `WikiRevisionList` requires a
 * `restoreActionBase`, so Console renders the local
 * `ReadOnlyWikiRevisionList` instead.
 */
export async function WikiPageData({
  organizationId,
  base,
  projectId,
  pageRef,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
  pageRef: string
}) {
  const decoded = decodeURIComponent(pageRef)
  const [projectResult, pageResult, pagesResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.wiki.retrieve(organizationId, projectId, decoded),
    projects.wiki.list(organizationId, projectId, { limit: 100 }),
  ])

  if (
    projectResult.error?.code === 'projects/project-not-found' ||
    pageResult.error?.code === 'projects/wiki-page-not-found'
  )
    notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (pageResult.error || !pageResult.data) {
    return (
      <AppError
        title="Wiki page could not be loaded"
        error={pageResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const page = toUiWikiPage(pageResult.data)
  const revisionsResult = await projects.wiki.listRevisions(
    organizationId,
    projectId,
    pageResult.data.id,
    { limit: 50 },
  )
  const revisions = (revisionsResult.data?.data ?? []).map((revision, index) =>
    toUiWikiRevision(revision, {
      index,
      total: pageResult.data.revisionCount,
    }),
  )

  const wikiBase = `${base}/projects/${encodeURIComponent(projectId)}/wiki`
  const wikiError = pagesResult.error ?? revisionsResult.error

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Wiki pages">
        <WikiTree
          pages={(pagesResult.data?.data ?? []).map(toUiWikiPage)}
          hrefBase={wikiBase}
          currentPageId={page.id}
        />
      </aside>
      <div className="space-y-6">
        {wikiError ? (
          <AppError
            title="Some wiki data could not be loaded"
            error={wikiError}
            variant="banner"
            showCode
          />
        ) : null}
        <WikiPageView page={page} bodyMarkdown={pageResult.data.body} />
        <section aria-label="Revisions" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[0.9375rem] font-semibold">
              Revisions ({revisions.length})
            </h2>
            <Link
              href={`${wikiBase}/${encodeURIComponent(page.id)}/revisions`}
              className="text-muted-foreground text-sm hover:underline"
            >
              View all revisions
            </Link>
          </div>
          <ReadOnlyWikiRevisionList revisions={revisions} />
        </section>
      </div>
    </div>
  )
}

/**
 * The data half of the wiki revisions record, shared by every host.
 * Read-only: every revision newest-first without restore affordances.
 */
export async function WikiRevisionsData({
  organizationId,
  projectId,
  pageRef,
}: {
  organizationId: string
  projectId: string
  pageRef: string
}) {
  const decoded = decodeURIComponent(pageRef)
  const [projectResult, pageResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.wiki.retrieve(organizationId, projectId, decoded),
  ])

  if (
    projectResult.error?.code === 'projects/project-not-found' ||
    pageResult.error?.code === 'projects/wiki-page-not-found'
  )
    notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (pageResult.error || !pageResult.data) {
    return (
      <AppError
        title="Wiki page could not be loaded"
        error={pageResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const revisionsResult = await projects.wiki.listRevisions(
    organizationId,
    projectId,
    pageResult.data.id,
    { limit: 100 },
  )

  if (revisionsResult.error || !revisionsResult.data) {
    return (
      <AppError
        title="Wiki revisions could not be loaded"
        error={revisionsResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const revisions = revisionsResult.data.data.map((revision, index) =>
    toUiWikiRevision(revision, {
      index,
      total: pageResult.data.revisionCount,
    }),
  )

  return <ReadOnlyWikiRevisionList revisions={revisions} />
}
