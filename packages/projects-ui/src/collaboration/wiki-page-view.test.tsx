// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WikiPageView } from './wiki-page-view'
import type { WikiPage } from './types'

function makePage(overrides?: Partial<WikiPage>): WikiPage {
  return {
    object: 'projects.wiki-page',
    id: 'wp_1',
    projectId: 'prj_1',
    slug: 'home',
    title: 'Home',
    parentId: null,
    currentRevision: 3,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('WikiPageView', () => {
  afterEach(cleanup)

  it('renders the page title as a heading', () => {
    render(<WikiPageView page={makePage()} bodyMarkdown="Body text" />)

    expect(
      screen.getByRole('heading', { name: 'Home', level: 1 })
    ).toBeInTheDocument()
  })

  it('renders the revision badge', () => {
    render(<WikiPageView page={makePage()} bodyMarkdown="Body text" />)

    expect(screen.getByText('Revision 3')).toBeInTheDocument()
  })

  it('renders the body through Markdown by default', () => {
    render(
      <WikiPageView page={makePage()} bodyMarkdown="**Bold intro**" />
    )

    expect(screen.getByText('Bold intro').tagName).toBe('STRONG')
  })

  it('renders Markdown lists', () => {
    render(<WikiPageView page={makePage()} bodyMarkdown={'- First\n- Second'} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('list')).toHaveTextContent('First Second')
  })

  it('renders the updated day', () => {
    render(<WikiPageView page={makePage()} bodyMarkdown="Body text" />)

    expect(screen.getByText('Updated Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders an empty body without crashing', () => {
    render(<WikiPageView page={makePage()} bodyMarkdown="" />)

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })

  it('updates the revision badge when the page changes', () => {
    const { rerender } = render(
      <WikiPageView page={makePage()} bodyMarkdown="Body text" />
    )

    expect(screen.getByText('Revision 3')).toBeInTheDocument()

    rerender(
      <WikiPageView
        page={makePage({ currentRevision: 7 })}
        bodyMarkdown="Body text"
      />
    )

    expect(screen.getByText('Revision 7')).toBeInTheDocument()
  })
})
