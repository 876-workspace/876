import { Badge } from '@876/ui/badge'
import { Markdown } from '@876/ui/markdown'

import type { UiWikiPage } from '../mappers'

export function WikiPageView({
  page,
  bodyMarkdown,
}: {
  page: UiWikiPage
  bodyMarkdown: string
}) {
  return (
    <article data-slot="wiki-page-view" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{page.title}</h1>
        <Badge variant="info">Revision {page.currentRevision}</Badge>
      </header>
      <Markdown content={bodyMarkdown} />
    </article>
  )
}
