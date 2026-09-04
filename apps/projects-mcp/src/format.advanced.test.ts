import type { Comment } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import { formatComment, formatComments } from './format'

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    object: 'projects.comment',
    id: 'cmt_1',
    tenantId: 'tnt_123',
    issueId: 'iss_123',
    authorUserId: 'usr_author',
    body: 'Ship the fix behind the flag.',
    createdAt: 1788400000,
    updatedAt: 1788400000,
    ...overrides,
  }
}

describe('formatComment', () => {
  it('renders the issue id, date, author, and full body', () => {
    const text = formatComment(comment())

    expect(text).toContain('iss_123')
    expect(text).toContain('@usr_author')
    expect(text).toContain('Ship the fix behind the flag.')
  })

  it('omits the author attribution when no author is recorded', () => {
    const text = formatComment(comment({ authorUserId: null }))

    expect(text).not.toContain('@')
    expect(text).toContain('Ship the fix behind the flag.')
  })

  it('keeps markdown bodies verbatim for the agent reader', () => {
    const body = '## Plan\n\n- [ ] Migrate\n\n`const ok = true`'

    const text = formatComment(comment({ body }))

    expect(text).toContain(body)
  })

  it('keeps hostile bodies verbatim without interpreting them', () => {
    const body = '<script>alert(1)</script> [x](javascript:alert(1))'

    const text = formatComment(comment({ body }))

    expect(text).toContain(body)
  })

  it('keeps multiline bodies intact across line breaks', () => {
    const body = 'First line\nSecond line\n\nFourth paragraph'

    const text = formatComment(comment({ body }))

    expect(text).toContain(body)
  })
})

describe('formatComments', () => {
  it('reports zero comments when the thread is empty', () => {
    expect(formatComments([])).toBe('0 comments recorded.')
  })

  it('renders a single comment under a Comments header', () => {
    const text = formatComments([comment()])

    expect(text.startsWith('Comments:')).toBe(true)
    expect(text).toContain('Ship the fix behind the flag.')
  })

  it('preserves the given oldest-first order across the thread', () => {
    const text = formatComments([
      comment({ id: 'cmt_old', body: 'First thought' }),
      comment({ id: 'cmt_new', body: 'Second thought' }),
    ])

    expect(text.indexOf('First thought')).toBeLessThan(
      text.indexOf('Second thought')
    )
  })

  it('renders every comment body in a five-comment thread', () => {
    const bodies = [
      'Kickoff notes',
      'Design sketch',
      'Implementation plan',
      'Review feedback',
      'Sign-off',
    ]

    const text = formatComments(
      bodies.map((body, index) => comment({ id: `cmt_${index}`, body }))
    )

    for (const body of bodies) expect(text).toContain(body)
  })

  it('renders each comment with its own author attribution', () => {
    const text = formatComments([
      comment({ id: 'cmt_a', authorUserId: 'usr_alice', body: 'Alice note' }),
      comment({ id: 'cmt_b', authorUserId: 'usr_ben', body: 'Ben note' }),
    ])

    expect(text).toContain('@usr_alice')
    expect(text).toContain('@usr_ben')
  })

  it('renders unicode and emoji bodies without loss', () => {
    const body = '修正计划 🎉 — “quoted” ✓ → done'

    const text = formatComments([comment({ body })])

    expect(text).toContain(body)
  })

  it('renders a 10000-character body in full', () => {
    const body = 'n'.repeat(10000)

    const text = formatComments([comment({ body })])

    expect(text).toContain(body)
  })
})
