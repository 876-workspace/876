'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { discussionsClient } from '@/lib/client/collaboration'

import type { UiDiscussion, UiDiscussionPost } from '../mappers'
import { ClientVisibleToggle } from './client-visible-toggle'
import { MentionInput, type MentionMember } from './mention-input'

export function NewDiscussionForm({
  projectId,
  members,
}: {
  projectId: string
  members: readonly MentionMember[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || !title.trim() || !body.trim()) return
    setPending(true)
    setError(null)
    const result = await discussionsClient.create(projectId, {
      title: title.trim(),
      body: body.trim(),
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/discussion-create-failed',
          message: 'The discussion could not be started.',
        }
      )
      return
    }
    router.push(
      `/projects/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(result.data.id)}`
    )
    router.refresh()
  }

  return (
    <form
      data-slot="new-discussion-form"
      onSubmit={submit}
      className="space-y-3 rounded-md border p-4"
    >
      <h2 className="text-sm font-semibold">Start a discussion</h2>
      {error ? <AppError error={error} variant="banner" /> : null}
      <div className="space-y-1">
        <label htmlFor="discussion-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="discussion-title"
          value={title}
          disabled={pending}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What should the team discuss?"
        />
      </div>
      <div className="space-y-1">
        <span id="discussion-body-label" className="text-sm font-medium">
          Opening post
        </span>
        <MentionInput
          id="discussion-body"
          name="body"
          value={body}
          onValueChange={setBody}
          members={members}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending || !title.trim() || !body.trim()}>
        {pending ? 'Starting…' : 'Start discussion'}
      </Button>
    </form>
  )
}

export function DiscussionControls({
  projectId,
  discussion,
}: {
  projectId: string
  discussion: UiDiscussion
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function setFlag(flag: 'pinned' | 'locked', value: boolean) {
    if (pending) return
    setPending(true)
    const result = await discussionsClient.update(projectId, discussion.id, {
      [flag]: value,
    })
    setPending(false)
    if (result.error || !result.data) return
    router.refresh()
  }

  return (
    <div
      data-slot="discussion-controls"
      className="flex flex-wrap items-center gap-2"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-pressed={discussion.pinned}
        onClick={() => setFlag('pinned', !discussion.pinned)}
      >
        {discussion.pinned ? 'Unpin' : 'Pin'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-pressed={discussion.locked}
        onClick={() => setFlag('locked', !discussion.locked)}
      >
        {discussion.locked ? 'Unlock' : 'Lock'}
      </Button>
      <ClientVisibleToggle
        endpoint={`/api/projects/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(discussion.id)}/visibility`}
        initialVisible={discussion.clientVisible}
        label={discussion.title}
      />
    </div>
  )
}

export function DiscussionReplyForm({
  projectId,
  discussionId,
  locked,
  members,
}: {
  projectId: string
  discussionId: string
  locked: boolean
  members: readonly MentionMember[]
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || locked || !body.trim()) return
    setPending(true)
    setError(null)
    const result = await discussionsClient.reply(projectId, discussionId, {
      body: body.trim(),
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/discussion-reply-failed',
          message: 'The reply could not be posted.',
        }
      )
      return
    }
    setBody('')
    router.refresh()
  }

  return (
    <form data-slot="discussion-reply-form" onSubmit={submit} className="space-y-3">
      {error ? <AppError error={error} variant="banner" /> : null}
      <div className="space-y-1">
        <span id="reply-body-label" className="text-sm font-medium">
          Reply
        </span>
        <MentionInput
          id="reply-body"
          name="body"
          value={body}
          onValueChange={setBody}
          members={members}
          disabled={pending || locked}
        />
      </div>
      {locked ? (
        <p className="text-muted-foreground text-sm">This discussion is locked.</p>
      ) : null}
      <Button type="submit" disabled={pending || locked || !body.trim()}>
        {pending ? 'Posting…' : 'Reply'}
      </Button>
    </form>
  )
}

export function DiscussionThreadView({
  discussion,
  posts,
}: {
  discussion: UiDiscussion
  posts: readonly UiDiscussionPost[]
}) {
  return (
    <section data-slot="discussion-thread" aria-label={discussion.title} className="space-y-4">
      {posts.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No posts yet
        </p>
      ) : (
        posts.map((post) => (
          <article key={post.id} className="rounded-md border px-4 py-3">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium">{post.authorLabel}</span>
              {post.editedAt !== null ? <span>Edited</span> : null}
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{post.bodyMarkdown}</p>
          </article>
        ))
      )}
    </section>
  )
}
