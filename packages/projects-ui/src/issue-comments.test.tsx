// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Comment } from '@876/projects/contracts'

import { IssueComments } from './issue-comments'

type CreateCommentResult = {
  data: Comment | null
  error: { code: string; message: string } | null
}

function makeComment(overrides?: Partial<Comment>): Comment {
  return {
    object: 'projects.comment',
    id: 'comment_seed_1',
    tenantId: 'tenant_1',
    issueId: 'issue_console_12',
    authorUserId: 'user_ana',
    body: 'Reproduced on staging, the sidebar covers the save button.',
    createdAt: 1710000000,
    updatedAt: 1710000000,
    ...overrides,
  }
}

const seedA = makeComment({
  id: 'comment_seed_1',
  authorUserId: 'user_ana',
  body: 'Reproduced on staging, the sidebar covers the save button.',
})

const seedB = makeComment({
  id: 'comment_seed_2',
  authorUserId: 'user_ben',
  body: '**Root cause:** the `SidebarShell` keeps a fixed width below 640px.',
})

function successHandler(result: Comment) {
  return vi.fn(async (body: string): Promise<CreateCommentResult> => ({
    data: { ...result, body },
    error: null,
  }))
}

function renderComments(
  comments: readonly Comment[],
  onCreateComment: (body: string) => Promise<CreateCommentResult>
) {
  return render(
    <IssueComments comments={comments} onCreateComment={onCreateComment} />
  )
}

function composer(): HTMLElement {
  return screen.getByPlaceholderText('Add a comment in Markdown…')
}

function commentButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Comment' })
}

describe('IssueComments', () => {
  afterEach(cleanup)

  it('heading, with two seeded comments, shows the seeded count', () => {
    renderComments([seedA, seedB], successHandler(makeComment()))

    expect(
      screen.getByRole('heading', { name: 'Comments (2)' })
    ).toBeInTheDocument()
  })

  it('heading, with no comments, shows a zero count', () => {
    renderComments([], successHandler(makeComment()))

    expect(
      screen.getByRole('heading', { name: 'Comments (0)' })
    ).toBeInTheDocument()
  })

  it('heading, with one seeded comment, shows a singular count', () => {
    renderComments([seedA], successHandler(makeComment()))

    expect(
      screen.getByRole('heading', { name: 'Comments (1)' })
    ).toBeInTheDocument()
  })

  it('heading, after a successful submit, increments the count', async () => {
    const reply = makeComment({ id: 'comment_reply_1' })

    renderComments([seedA], successHandler(reply))

    fireEvent.change(composer(), { target: { value: 'Verified the fix.' } })
    fireEvent.click(commentButton())

    expect(
      await screen.findByRole('heading', { name: 'Comments (2)' })
    ).toBeInTheDocument()
  })

  it('empty state, with no comments, shows the no-comments message', () => {
    renderComments([], successHandler(makeComment()))

    expect(screen.getByText('No comments yet')).toBeInTheDocument()
  })

  it('empty state, with seeded comments, hides the no-comments message', () => {
    renderComments([seedA], successHandler(makeComment()))

    expect(screen.queryByText('No comments yet')).toBeNull()
  })

  it('seeded comments, with authors, render each author id', () => {
    renderComments([seedA, seedB], successHandler(makeComment()))

    expect(screen.getByText('user_ana')).toBeInTheDocument()
    expect(screen.getByText('user_ben')).toBeInTheDocument()
  })

  it('seeded comment, without an author, falls back to Unknown', () => {
    const anonymous = makeComment({ id: 'comment_seed_3', authorUserId: null })

    renderComments([anonymous], successHandler(makeComment()))

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('seeded comment, with a timestamp, renders the calendar year', () => {
    renderComments([seedA], successHandler(makeComment()))

    const article = screen.getByRole('article')

    expect(within(article).getByText(/\d{4}/)).toBeInTheDocument()
  })

  it('seeded comment, with bold markdown, renders strong text', () => {
    renderComments([seedB], successHandler(makeComment()))

    const strong = screen.getByText('Root cause:')

    expect(strong.tagName).toBe('STRONG')
  })

  it('seeded comment, with a markdown list, renders list items', () => {
    const listed = makeComment({
      id: 'comment_seed_4',
      body: '- Open the editor below 640px\n- Toggle the sidebar',
    })

    renderComments([listed], successHandler(makeComment()))

    expect(screen.getByText('Open the editor below 640px')).toBeInTheDocument()
    expect(screen.getByText('Toggle the sidebar')).toBeInTheDocument()
  })

  it('seeded comments, with two items, render two articles', () => {
    renderComments([seedA, seedB], successHandler(makeComment()))

    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('comment button, with an empty composer, stays disabled', () => {
    renderComments([seedA], successHandler(makeComment()))

    expect(commentButton()).toBeDisabled()
  })

  it('comment button, with whitespace-only input, stays disabled', () => {
    renderComments([seedA], successHandler(makeComment()))

    fireEvent.change(composer(), { target: { value: '   \n  ' } })

    expect(commentButton()).toBeDisabled()
  })

  it('comment button, after typing text, becomes enabled', () => {
    renderComments([seedA], successHandler(makeComment()))

    fireEvent.change(composer(), { target: { value: 'Looks good to me.' } })

    expect(commentButton()).toBeEnabled()
  })

  it('submit, with an empty composer, never calls the service', () => {
    const onCreateComment = successHandler(makeComment())

    renderComments([], onCreateComment)

    fireEvent.click(commentButton())

    expect(onCreateComment).not.toHaveBeenCalled()
  })

  it('submit, with padded input, calls the service with the trimmed body', async () => {
    const onCreateComment = successHandler(
      makeComment({ id: 'comment_reply_2' })
    )

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: '   Trim this draft   ' } })
    fireEvent.click(commentButton())

    await screen.findByRole('heading', { name: 'Comments (1)' })

    expect(onCreateComment).toHaveBeenCalledWith('Trim this draft')
  })

  it('submit, on success, appends the returned comment to the list', async () => {
    const reply = makeComment({
      id: 'comment_reply_3',
      authorUserId: 'user_cara',
      body: 'Deployed behind the sidebar flag.',
    })

    renderComments(
      [seedA],
      vi.fn(async (): Promise<CreateCommentResult> => ({
        data: reply,
        error: null,
      }))
    )

    fireEvent.change(composer(), {
      target: { value: 'Deployed behind the sidebar flag.' },
    })
    fireEvent.click(commentButton())

    expect(
      await screen.findByText('Deployed behind the sidebar flag.')
    ).toBeInTheDocument()

    expect(screen.getByText('user_cara')).toBeInTheDocument()
  })

  it('submit, on success, clears the composer', async () => {
    renderComments([seedA], successHandler(makeComment({ id: 'comment_r4' })))

    fireEvent.change(composer(), { target: { value: 'One more note.' } })
    fireEvent.click(commentButton())

    await screen.findByRole('heading', { name: 'Comments (2)' })

    expect(composer()).toHaveValue('')
    expect(commentButton()).toBeDisabled()
  })

  it('submit, on success, clears a prior error banner', async () => {
    const reply = makeComment({ id: 'comment_reply_5' })
    const onCreateComment = vi.fn(
      async (body: string): Promise<CreateCommentResult> => ({
        data: { ...reply, body },
        error: null,
      })
    )
    onCreateComment.mockImplementationOnce(
      async (): Promise<CreateCommentResult> => ({
        data: null,
        error: {
          code: 'projects/comment-create-failed',
          message: 'Comment service unavailable.',
        },
      })
    )

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'First attempt.' } })
    fireEvent.click(commentButton())

    expect(await screen.findByText('Comment not added')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Comment' }))

    await screen.findByText('First attempt.')

    expect(screen.queryByText('Comment not added')).toBeNull()
  })

  it('submit, while pending, shows the Commenting label', async () => {
    let resolveCreate!: (value: CreateCommentResult) => void
    const pendingResult = new Promise<CreateCommentResult>((resolve) => {
      resolveCreate = resolve
    })
    const onCreateComment = vi.fn(
      (): Promise<CreateCommentResult> => pendingResult
    )

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'Sending now.' } })
    fireEvent.click(commentButton())

    expect(
      await screen.findByRole('button', { name: 'Commenting…' })
    ).toBeInTheDocument()

    resolveCreate({
      data: makeComment({ id: 'comment_reply_6', body: 'Sending now.' }),
      error: null,
    })

    await screen.findByRole('heading', { name: 'Comments (1)' })
  })

  it('submit, while pending, disables the Comment button', () => {
    let resolveCreate!: (value: CreateCommentResult) => void
    const pendingResult = new Promise<CreateCommentResult>((resolve) => {
      resolveCreate = resolve
    })
    const onCreateComment = vi.fn(
      (): Promise<CreateCommentResult> => pendingResult
    )

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'Sending now.' } })
    fireEvent.click(commentButton())

    expect(screen.getByRole('button', { name: 'Commenting…' })).toBeDisabled()

    resolveCreate({
      data: makeComment({ id: 'comment_reply_7', body: 'Sending now.' }),
      error: null,
    })
  })

  it('submit, while pending, disables the editor', () => {
    let resolveCreate!: (value: CreateCommentResult) => void
    const pendingResult = new Promise<CreateCommentResult>((resolve) => {
      resolveCreate = resolve
    })
    const onCreateComment = vi.fn(
      (): Promise<CreateCommentResult> => pendingResult
    )

    renderComments([], onCreateComment)

    const editor = composer()

    fireEvent.change(editor, { target: { value: 'Sending now.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comment' }))

    expect(editor).toBeDisabled()

    resolveCreate({
      data: makeComment({ id: 'comment_reply_8', body: 'Sending now.' }),
      error: null,
    })
  })

  it('submit, on service error, shows the banner title and message', async () => {
    const onCreateComment = vi.fn(async (): Promise<CreateCommentResult> => ({
      data: null,
      error: {
        code: 'projects/comment-create-failed',
        message: 'Comment service unavailable.',
      },
    }))

    renderComments([seedA], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'Lost update.' } })
    fireEvent.click(commentButton())

    expect(await screen.findByText('Comment not added')).toBeInTheDocument()
    expect(
      await screen.findByText('Comment service unavailable.')
    ).toBeInTheDocument()
  })

  it('submit, on service error, keeps the draft in the composer', async () => {
    const onCreateComment = vi.fn(async (): Promise<CreateCommentResult> => ({
      data: null,
      error: {
        code: 'projects/comment-create-failed',
        message: 'Comment service unavailable.',
      },
    }))

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'Keep this draft.' } })
    fireEvent.click(commentButton())

    await screen.findByText('Comment not added')

    expect(composer()).toHaveValue('Keep this draft.')
  })

  it('submit, on service error, leaves the comment count unchanged', async () => {
    const onCreateComment = vi.fn(async (): Promise<CreateCommentResult> => ({
      data: null,
      error: {
        code: 'projects/comment-create-failed',
        message: 'Comment service unavailable.',
      },
    }))

    renderComments([seedA], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'Lost update.' } })
    fireEvent.click(commentButton())

    await screen.findByText('Comment not added')

    expect(
      screen.getByRole('heading', { name: 'Comments (1)' })
    ).toBeInTheDocument()
  })

  it('submit, on null data without an error, shows the default banner message', async () => {
    const onCreateComment = vi.fn(async (): Promise<CreateCommentResult> => ({
      data: null,
      error: null,
    }))

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'Vanishing draft.' } })
    fireEvent.click(commentButton())

    expect(await screen.findByText('Comment not added')).toBeInTheDocument()
    expect(
      await screen.findByText('Comment could not be added.')
    ).toBeInTheDocument()
  })

  it('submit, across two sequential comments, accumulates both in order', async () => {
    const first = makeComment({ id: 'comment_seq_1', body: 'First follow-up.' })
    const second = makeComment({
      id: 'comment_seq_2',
      body: 'Second follow-up.',
    })
    const onCreateComment = vi.fn(
      async (body: string): Promise<CreateCommentResult> => ({
        data: body === 'First follow-up.' ? first : second,
        error: null,
      })
    )

    renderComments([], onCreateComment)

    fireEvent.change(composer(), { target: { value: 'First follow-up.' } })
    fireEvent.click(commentButton())

    await screen.findByText('First follow-up.')

    fireEvent.change(composer(), { target: { value: 'Second follow-up.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Comment' }))

    await screen.findByText('Second follow-up.')

    const articles = screen.getAllByRole('article')

    expect(articles).toHaveLength(2)
    expect(articles[0]).toHaveTextContent('First follow-up.')
    expect(articles[1]).toHaveTextContent('Second follow-up.')
  })

  it('seeded comment, with a script payload, renders no script element', () => {
    const hostile = makeComment({
      id: 'comment_seed_xss',
      body: '<script>alert("stored-xss")</script>',
    })

    const { container } = render(
      <IssueComments
        comments={[hostile]}
        onCreateComment={successHandler(makeComment())}
      />
    )

    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('section, on render, exposes the Comments region label', () => {
    renderComments([seedA], successHandler(makeComment()))

    expect(screen.getByRole('region', { name: 'Comments' })).toBeInTheDocument()
  })

  describe('edit and delete affordances', () => {
    function updateHandler() {
      return vi.fn(
        async (
          commentId: string,
          body: string
        ): Promise<{
          data: Comment | null
          error: { code: string; message: string } | null
        }> => ({
          data: { ...seedA, id: commentId, body },
          error: null,
        })
      )
    }

    function deleteHandler() {
      return vi.fn(
        async (
          commentId: string
        ): Promise<{
          data: { object: string; id: string; deleted: true } | null
          error: { code: string; message: string } | null
        }> => ({
          data: { object: 'projects.comment', id: commentId, deleted: true },
          error: null,
        })
      )
    }

    it('with no currentUserId, shows no actions menu on any comment', () => {
      render(
        <IssueComments
          comments={[seedA]}
          onCreateComment={successHandler(makeComment())}
          onUpdateComment={updateHandler()}
          onDeleteComment={deleteHandler()}
        />
      )

      expect(
        screen.queryByRole('button', { name: 'Comment actions' })
      ).toBeNull()
    })

    it("with a currentUserId that doesn't match the author, shows no actions menu", () => {
      render(
        <IssueComments
          comments={[seedA]}
          currentUserId="user_someone_else"
          onCreateComment={successHandler(makeComment())}
          onUpdateComment={updateHandler()}
          onDeleteComment={deleteHandler()}
        />
      )

      expect(
        screen.queryByRole('button', { name: 'Comment actions' })
      ).toBeNull()
    })

    it('with a matching currentUserId but no update/delete callbacks, shows no actions menu', () => {
      render(
        <IssueComments
          comments={[seedA]}
          currentUserId={seedA.authorUserId ?? undefined}
          onCreateComment={successHandler(makeComment())}
        />
      )

      expect(
        screen.queryByRole('button', { name: 'Comment actions' })
      ).toBeNull()
    })

    it('with a matching currentUserId and both callbacks, shows the actions menu for that comment only', () => {
      render(
        <IssueComments
          comments={[seedA, seedB]}
          currentUserId={seedA.authorUserId ?? undefined}
          onCreateComment={successHandler(makeComment())}
          onUpdateComment={updateHandler()}
          onDeleteComment={deleteHandler()}
        />
      )

      expect(
        screen.getAllByRole('button', { name: 'Comment actions' })
      ).toHaveLength(1)
    })

    it('with only onUpdateComment supplied, still shows the actions menu for the author', () => {
      render(
        <IssueComments
          comments={[seedA]}
          currentUserId={seedA.authorUserId ?? undefined}
          onCreateComment={successHandler(makeComment())}
          onUpdateComment={updateHandler()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Comment actions' })
      ).toBeInTheDocument()
    })

    it('with only onDeleteComment supplied, still shows the actions menu for the author', () => {
      render(
        <IssueComments
          comments={[seedA]}
          currentUserId={seedA.authorUserId ?? undefined}
          onCreateComment={successHandler(makeComment())}
          onDeleteComment={deleteHandler()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Comment actions' })
      ).toBeInTheDocument()
    })
  })
})
