// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WikiRevisionList } from './wiki-revision-list'
import type { WikiRevision } from './types'

function makeRevision(overrides?: Partial<WikiRevision>): WikiRevision {
  return {
    object: 'projects.wiki-revision',
    id: 'rev_1',
    pageId: 'wp_1',
    revision: 2,
    authorLabel: 'Alice',
    bodyMarkdown: 'First body',
    createdAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('WikiRevisionList', () => {
  afterEach(cleanup)

  it('renders one row per revision', () => {
    render(
      <WikiRevisionList
        revisions={[
          makeRevision(),
          makeRevision({ id: 'rev_2', revision: 1 }),
        ]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    expect(screen.getAllByText(/Revision \d/)).toHaveLength(2)
  })

  it('labels each revision with its number', () => {
    render(
      <WikiRevisionList
        revisions={[makeRevision()]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    expect(screen.getByText('Revision 2')).toBeInTheDocument()
  })

  it('renders the author and created day', () => {
    render(
      <WikiRevisionList
        revisions={[makeRevision()]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    expect(screen.getByText('Alice · Mar 4, 2026')).toBeInTheDocument()
  })

  it('posts the restore form to the revision id', () => {
    render(
      <WikiRevisionList
        revisions={[makeRevision()]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    const form = document.querySelector('form')
    expect(form).toHaveAttribute(
      'action',
      '/projects/prj_1/wiki/wp_1/revisions/rev_1'
    )
    expect(form).toHaveAttribute('method', 'post')
  })

  it('encodes the revision id in the action', () => {
    render(
      <WikiRevisionList
        revisions={[makeRevision({ id: 'rev/1 2' })]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    expect(document.querySelector('form')).toHaveAttribute(
      'action',
      '/projects/prj_1/wiki/wp_1/revisions/rev%2F1%202'
    )
  })

  it('labels the restore button with the revision number', () => {
    render(
      <WikiRevisionList
        revisions={[makeRevision()]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    expect(
      screen.getByRole('button', { name: 'Restore revision 2' })
    ).toBeInTheDocument()
  })

  it('renders the empty state without revisions', () => {
    render(
      <WikiRevisionList
        revisions={[]}
        restoreActionBase="/projects/prj_1/wiki/wp_1/revisions"
      />
    )

    expect(screen.getByText('No revisions yet')).toBeInTheDocument()
  })
})
