'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { wikiClient } from '@/lib/client/collaboration'

import type { UiWikiPage, UiWikiRevision } from '@/types/collaboration'
import { MentionInput } from './mention-input'
import type { MentionMember } from '@/types/collaboration'
import { WikiRevisionList } from './wiki-revision-list'

import type { WikiPageOption } from '@/types/collaboration'

export type { WikiPageOption }

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

export function WikiPageForm({
  projectId,
  page,
  pages,
  members,
  parentPageId,
}: {
  projectId: string
  page?: UiWikiPage | null
  pages: readonly WikiPageOption[]
  members: readonly MentionMember[]
  parentPageId?: string | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState(page?.title ?? '')
  const [body, setBody] = useState('')
  const [parent, setParent] = useState<string>(
    parentPageId ?? page?.parentId ?? ''
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const editing = page !== null && page !== undefined

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || !title.trim() || (!editing && !body.trim())) return
    setPending(true)
    setError(null)
    const params = {
      title: title.trim(),
      ...(body.trim() ? { body: body.trim() } : {}),
      ...(parent ? { parentPageId: parent } : { parentPageId: null }),
    }
    const result = editing
      ? await wikiClient.update(projectId, page.id, params)
      : await wikiClient.create(projectId, {
          title: title.trim(),
          body: body.trim(),
          ...(slugify(title.trim()) ? { slug: slugify(title.trim()) } : {}),
          ...(parent ? { parentPageId: parent } : {}),
        })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/wiki-save-failed',
          message: 'The wiki page could not be saved.',
        }
      )
      return
    }
    router.push(
      `/projects/${encodeURIComponent(projectId)}/wiki/${encodeURIComponent(result.data.slug)}`
    )
    router.refresh()
  }

  return (
    <form
      data-slot="wiki-page-form"
      onSubmit={submit}
      className="space-y-3 rounded-md border p-4"
    >
      <h2 className="text-sm font-semibold">
        {editing ? 'Edit wiki page' : 'New wiki page'}
      </h2>
      {error ? <AppError error={error} variant="banner" /> : null}
      <div className="space-y-1">
        <label htmlFor="wiki-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="wiki-title"
          value={title}
          disabled={pending}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Page title"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="wiki-parent" className="text-sm font-medium">
          Parent page
        </label>
        <select
          id="wiki-parent"
          value={parent}
          disabled={pending}
          onChange={(event) => setParent(event.target.value)}
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Top level</option>
          {pages
            .filter((option) => option.id !== page?.id)
            .map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
        </select>
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">
          {editing ? 'New revision (leave empty to keep the body)' : 'Body'}
        </span>
        <MentionInput
          id="wiki-body"
          name="body"
          value={body}
          onValueChange={setBody}
          members={members}
          disabled={pending}
          required={!editing}
        />
      </div>
      <Button
        type="submit"
        disabled={pending || !title.trim() || (!editing && !body.trim())}
      >
        {pending ? 'Saving…' : editing ? 'Save new revision' : 'Create page'}
      </Button>
    </form>
  )
}

export function WikiRevisionHistory({
  projectId,
  pageRef,
  page,
  revisions,
}: {
  projectId: string
  pageRef: string
  page: UiWikiPage
  revisions: readonly UiWikiRevision[]
}) {
  return (
    <WikiRevisionList
      projectId={projectId}
      pageRef={pageRef}
      pageTitle={page.title}
      revisions={revisions}
    />
  )
}
