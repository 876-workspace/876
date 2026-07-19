'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { browserKnowledge } from '@876/widgets/browser/knowledge'
import type { KbArticle, KnowledgeWidgetHost } from '@876/widgets'
import { buttonVariants } from '@876/ui/button'
import { toast } from 'sonner'

const HOSTS: KnowledgeWidgetHost[] = [
  'console',
  'billing',
  'couriers',
  'enterprise',
  '876',
]

export function KnowledgeBaseAdminManager() {
  const [results, setResults] = useState<KbArticle[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [host, setHost] = useState<string>('all')

  // Create form
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState(
    JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: '' } }],
    })
  )
  const [hosts, setHosts] = useState<KnowledgeWidgetHost[]>(['console'])
  const [audience, setAudience] = useState<
    'org_member' | 'end_user' | 'platform_admin'
  >('org_member')
  const [articleStatus, setArticleStatus] = useState<
    'draft' | 'published' | 'archived'
  >('draft')
  const [featured, setFeatured] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(
    async (nextCursor?: string) => {
      setLoading(true)
      const result = await browserKnowledge.admin.articles.list({
        status:
          status === 'all'
            ? undefined
            : (status as 'draft' | 'published' | 'archived'),
        host: host === 'all' ? undefined : (host as KnowledgeWidgetHost),
        q: q.trim() || undefined,
        cursor: nextCursor,
        limit: 25,
      })
      setLoading(false)
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      setResults((prev) =>
        nextCursor ? [...prev, ...result.data.data] : result.data.data
      )
      setHasMore(result.data.has_more)
      setCursor(result.data.continue_cursor)
    },
    [status, host, q]
  )

  useEffect(() => {
    void load()
  }, [load])

  function toggleHost(h: KnowledgeWidgetHost) {
    setHosts((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    )
  }

  async function createArticle(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !slug.trim() || hosts.length === 0) {
      toast.error('Title, slug, and at least one host are required.')
      return
    }
    setSaving(true)
    try {
      const result = await browserKnowledge.admin.articles.create({
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim() || undefined,
        body,
        status: articleStatus,
        audience,
        hosts,
        featured,
      })
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      toast.success('Article created.')
      setTitle('')
      setSlug('')
      setSummary('')
      setBody(
        JSON.stringify({
          blocks: [{ type: 'paragraph', data: { text: '' } }],
        })
      )
      setFeatured(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this article permanently?')) return
    const result = await browserKnowledge.admin.articles.delete(id)
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    toast.success('Article deleted.')
    await load()
  }

  async function publish(id: string) {
    const result = await browserKnowledge.admin.articles.update(id, {
      status: 'published',
    })
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    toast.success('Published.')
    await load()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold">Articles</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void load()
        }}
        className="flex max-w-3xl flex-col gap-2 sm:flex-row"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        >
          <option value="all">All hosts</option>
          {HOSTS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Filter
        </button>
      </form>

      <div className="876-card overflow-hidden">
        {loading && results.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">No articles yet.</p>
        ) : (
          <ul className="divide-876-surface-border divide-y">
            {results.map((article) => (
              <li
                key={article.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium">{article.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {article.status} · {article.audience} ·{' '}
                    {article.hosts.join(', ')}
                    {article.featured ? ' · featured' : ''}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {article.status !== 'published' ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                      onClick={() => void publish(article.id)}
                    >
                      Publish
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                    onClick={() => void remove(article.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hasMore ? (
          <div className="p-3">
            <button
              type="button"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              onClick={() => void load(cursor)}
              disabled={loading}
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>

      <section className="max-w-2xl space-y-4">
        <h2 className="font-semibold">Add article</h2>
        <form onSubmit={(e) => void createArticle(e)} className="space-y-3">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slug)
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                )
            }}
            placeholder="Title"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            required
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug-kebab-case"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            required
          />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary (optional)"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="border-input bg-background w-full rounded-md border px-3 py-2 font-mono text-xs"
            aria-label="Editor.js JSON body"
          />
          <p className="text-muted-foreground text-xs">
            Body is Editor.js JSON for now. Full visual editor ships next; image
            uploads use UploadThing <code className="text-xs">kbImage</code>.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1">
              Status
              <select
                value={articleStatus}
                onChange={(e) =>
                  setArticleStatus(
                    e.target.value as 'draft' | 'published' | 'archived'
                  )
                }
                className="border-input bg-background h-8 rounded-md border px-2"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              Audience
              <select
                value={audience}
                onChange={(e) =>
                  setAudience(
                    e.target.value as
                      | 'org_member'
                      | 'end_user'
                      | 'platform_admin'
                  )
                }
                className="border-input bg-background h-8 rounded-md border px-2"
              >
                <option value="end_user">end_user</option>
                <option value="org_member">org_member</option>
                <option value="platform_admin">platform_admin</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Featured
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {HOSTS.map((h) => (
              <label key={h} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={hosts.includes(h)}
                  onChange={() => toggleHost(h)}
                />
                {h}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
        <p className="text-muted-foreground text-xs">
          Widget flags and access are managed on the{' '}
          <Link href="/widgets/knowledge-base/access" className="underline">
            Access
          </Link>{' '}
          tab.
        </p>
      </section>
    </div>
  )
}
