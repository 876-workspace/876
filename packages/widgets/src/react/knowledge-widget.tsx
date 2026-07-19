'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@876/core/utils'

import { browserKnowledge } from '../browser/knowledge'
import type { KbArticle, KbCategory } from '../types/knowledge'
import { KnowledgeBodyEditor } from './knowledge-body-editor'
import { WidgetPanelSkeleton } from './widget-loading'

type View =
  | { kind: 'home' }
  | { kind: 'category'; categoryId: string; name: string }
  | { kind: 'article'; id: string }
  | { kind: 'saved' }

export function KnowledgeBaseWidget() {
  return <KnowledgeBaseWidgetPanel />
}

export function KnowledgeBaseWidgetPanel() {
  const [view, setView] = useState<View>({ kind: 'home' })
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [featured, setFeatured] = useState<KbArticle[]>([])
  const [article, setArticle] = useState<KbArticle | null>(null)
  const [bookmarks, setBookmarks] = useState<
    Array<{ article_id: string; article?: { id: string; title: string } }>
  >([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHome = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [catRes, featRes, bmRes] = await Promise.all([
      browserKnowledge.categories.list(),
      browserKnowledge.articles.list({ featured: true, limit: 8 }),
      browserKnowledge.bookmarks.list(),
    ])
    setLoading(false)

    if (catRes.error || !catRes.data) {
      setError(catRes.error ?? 'Failed to load categories.')
      return
    }
    if (featRes.error || !featRes.data) {
      setError(featRes.error ?? 'Failed to load articles.')
      return
    }

    setCategories(catRes.data.data)
    setFeatured(featRes.data.data)
    if (bmRes.error === null && bmRes.data) {
      setBookmarks(bmRes.data.data)
      setBookmarkedIds(new Set(bmRes.data.data.map((b) => b.article_id)))
    }
  }, [])

  const loadCategory = useCallback(async (categoryId: string) => {
    setLoading(true)
    setError(null)
    const result = await browserKnowledge.articles.list({
      category_id: categoryId,
      limit: 50,
    })
    setLoading(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to load articles.')
      return
    }
    setArticles(result.data.data)
  }, [])

  const loadSearch = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    const result = await browserKnowledge.articles.list({ q, limit: 40 })
    setLoading(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Search failed.')
      return
    }
    setArticles(result.data.data)
  }, [])

  const loadArticle = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    const result = await browserKnowledge.articles.retrieve(id)
    setLoading(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Article not found.')
      setArticle(null)
      return
    }
    setArticle(result.data)
  }, [])

  const loadSaved = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await browserKnowledge.bookmarks.list()
    setLoading(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to load saved articles.')
      return
    }
    setBookmarks(result.data.data)
    setBookmarkedIds(new Set(result.data.data.map((b) => b.article_id)))
  }, [])

  useEffect(() => {
    if (view.kind === 'home') void loadHome()
    else if (view.kind === 'category') void loadCategory(view.categoryId)
    else if (view.kind === 'article') void loadArticle(view.id)
    else if (view.kind === 'saved') void loadSaved()
  }, [view, loadHome, loadCategory, loadArticle, loadSaved])

  async function toggleBookmark(articleId: string) {
    if (bookmarkedIds.has(articleId)) {
      const result = await browserKnowledge.bookmarks.delete(articleId)
      if (result.error) return
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        next.delete(articleId)
        return next
      })
    } else {
      const result = await browserKnowledge.bookmarks.create(articleId)
      if (result.error) return
      setBookmarkedIds((prev) => new Set(prev).add(articleId))
    }
  }

  const header = useMemo(() => {
    if (view.kind === 'home') return 'Knowledge base'
    if (view.kind === 'category') return view.name
    if (view.kind === 'saved') return 'Saved'
    if (view.kind === 'article') return article?.title ?? 'Article'
    return 'Knowledge base'
  }, [view, article])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
        {view.kind !== 'home' ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
            onClick={() => {
              if (view.kind === 'article') setView({ kind: 'home' })
              else setView({ kind: 'home' })
            }}
          >
            Back
          </button>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {header}
        </h2>
        {view.kind === 'home' ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs"
            onClick={() => setView({ kind: 'saved' })}
          >
            Saved
          </button>
        ) : null}
        {view.kind === 'article' && article ? (
          <button
            type="button"
            className={cn(
              'text-xs font-medium',
              bookmarkedIds.has(article.id)
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => void toggleBookmark(article.id)}
          >
            {bookmarkedIds.has(article.id) ? 'Saved' : 'Save'}
          </button>
        ) : null}
      </div>

      {view.kind === 'home' || view.kind === 'category' ? (
        <div className="border-border border-b px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim())
                void loadSearch(query.trim())
            }}
            placeholder="Search articles…"
            className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
            aria-label="Search articles"
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? <WidgetPanelSkeleton /> : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && view.kind === 'home' ? (
          <div className="space-y-5">
            {featured.length > 0 ? (
              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  Featured
                </h3>
                <ul className="space-y-1.5">
                  {featured.map((item) => (
                    <ArticleRow
                      key={item.id}
                      title={item.title}
                      summary={item.summary}
                      onClick={() => setView({ kind: 'article', id: item.id })}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Categories
              </h3>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No categories yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        className="hover:bg-muted/60 w-full rounded-md px-2 py-2 text-left text-sm font-medium"
                        onClick={() =>
                          setView({
                            kind: 'category',
                            categoryId: cat.id,
                            name: cat.name,
                          })
                        }
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {articles.length > 0 && query.trim() ? (
              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  Results
                </h3>
                <ul className="space-y-1.5">
                  {articles.map((item) => (
                    <ArticleRow
                      key={item.id}
                      title={item.title}
                      summary={item.summary}
                      onClick={() => setView({ kind: 'article', id: item.id })}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && view.kind === 'category' ? (
          <ul className="space-y-1.5">
            {articles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No articles.</p>
            ) : (
              articles.map((item) => (
                <ArticleRow
                  key={item.id}
                  title={item.title}
                  summary={item.summary}
                  onClick={() => setView({ kind: 'article', id: item.id })}
                />
              ))
            )}
          </ul>
        ) : null}

        {!loading && !error && view.kind === 'saved' ? (
          <ul className="space-y-1.5">
            {bookmarks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No saved articles yet.
              </p>
            ) : (
              bookmarks.map((bm) => (
                <ArticleRow
                  key={bm.article_id}
                  title={bm.article?.title ?? 'Article'}
                  summary={null}
                  onClick={() =>
                    setView({ kind: 'article', id: bm.article_id })
                  }
                />
              ))
            )}
          </ul>
        ) : null}

        {!loading && !error && view.kind === 'article' && article ? (
          <article className="space-y-3">
            {article.summary ? (
              <p className="text-muted-foreground text-sm">{article.summary}</p>
            ) : null}
            <KnowledgeBodyEditor
              key={article.id}
              initialBody={article.body}
              readOnly
              className="text-sm"
            />
          </article>
        ) : null}
      </div>
    </div>
  )
}

function ArticleRow({
  title,
  summary,
  onClick,
}: {
  title: string
  summary: string | null
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-muted/60 w-full rounded-md px-2 py-2 text-left"
      >
        <div className="text-sm font-medium">{title}</div>
        {summary ? (
          <div className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {summary}
          </div>
        ) : null}
      </button>
    </li>
  )
}
