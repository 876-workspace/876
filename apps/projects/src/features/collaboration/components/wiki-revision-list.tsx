'use client'

import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { wikiClient } from '@/lib/client/collaboration'
import type { UiWikiRevision } from '@/types/collaboration'

export function WikiRevisionList({
  projectId,
  pageRef,
  pageTitle,
  revisions,
}: {
  projectId: string
  pageRef: string
  pageTitle: string
  revisions: readonly UiWikiRevision[]
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (revisions.length === 0) {
    return (
      <p
        data-slot="wiki-revision-list-empty"
        className="text-muted-foreground py-12 text-center text-sm"
      >
        No revisions yet
      </p>
    )
  }

  async function restore(revisionId: string) {
    if (pendingId !== null) return
    setPendingId(revisionId)
    const result = await wikiClient.restore(projectId, pageRef, { revisionId })
    setPendingId(null)
    if (result.error || !result.data) return
    router.refresh()
  }

  return (
    <section aria-label={`Revisions of ${pageTitle}`} className="space-y-2">
      <h2 className="text-sm font-semibold">Revisions</h2>
      <ul data-slot="wiki-revision-list" className="flex flex-col gap-2">
        {revisions.map((revision) => (
          <li
            key={revision.id}
            data-slot="wiki-revision-list-item"
            className="rounded-md border px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                Revision {revision.revision}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingId !== null}
                onClick={() => restore(revision.id)}
              >
                {pendingId === revision.id
                  ? 'Restoring…'
                  : `Restore revision ${revision.revision}`}
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {revision.authorLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
