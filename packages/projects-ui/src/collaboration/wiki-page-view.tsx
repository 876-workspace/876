import { Markdown } from '@876/ui/markdown'
import { Badge } from '@876/ui/badge'

import { formatDay } from '../finance/format-money'
import type { WikiPage } from './types'

export type WikiPageViewProps = {
  page: WikiPage
  bodyMarkdown: string
}

export function WikiPageView({
  page,
  bodyMarkdown,
}: WikiPageViewProps) {
  return (
    <article data-slot="wiki-page-view" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{page.title}</h1>
        <Badge variant="info">Revision {page.currentRevision}</Badge>
      </header>
      <Markdown content={bodyMarkdown} />
      <p className="text-muted-foreground text-xs">
        Updated {formatDay(page.updatedAt)}
      </p>
    </article>
  )
}
