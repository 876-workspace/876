// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WikiTree } from './wiki-tree'
import type { WikiPage } from './types'

function makePage(overrides?: Partial<WikiPage>): WikiPage {
  return {
    object: 'projects.wiki-page',
    id: 'wp_1',
    projectId: 'prj_1',
    slug: 'home',
    title: 'Home',
    parentId: null,
    currentRevision: 1,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('WikiTree', () => {
  afterEach(cleanup)

  it('renders one link per page', () => {
    render(
      <WikiTree
        pages={[makePage(), makePage({ id: 'wp_2', title: 'Guide', parentId: 'wp_1' })]}
        hrefBase="/wiki"
        currentPageId={null}
      />
    )

    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('nests a child under its parent', () => {
    const { container } = render(
      <WikiTree
        pages={[makePage(), makePage({ id: 'wp_2', title: 'Guide', parentId: 'wp_1' })]}
        hrefBase="/wiki"
        currentPageId={null}
      />
    )

    const outer = container.querySelector('ul')
    expect(outer).not.toBeNull()
    expect(outer!.querySelectorAll(':scope > li')).toHaveLength(1)
  })

  it('links to hrefBase plus the page id', () => {
    render(
      <WikiTree pages={[makePage()]} hrefBase="/projects/prj_1/wiki" currentPageId={null} />
    )

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/projects/prj_1/wiki/wp_1'
    )
  })

  it('encodes the page id in the href', () => {
    render(
      <WikiTree pages={[makePage({ id: 'wp/1 2' })]} hrefBase="/wiki" currentPageId={null} />
    )

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/wiki/wp%2F1%202'
    )
  })

  it('highlights the current page with aria-current', () => {
    render(
      <WikiTree pages={[makePage()]} hrefBase="/wiki" currentPageId="wp_1" />
    )

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('does not highlight when no page is current', () => {
    render(
      <WikiTree pages={[makePage()]} hrefBase="/wiki" currentPageId={null} />
    )

    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('keeps orphans visible as roots', () => {
    render(
      <WikiTree
        pages={[makePage(), makePage({ id: 'wp_2', title: 'Orphan', parentId: 'wp_missing' })]}
        hrefBase="/wiki"
        currentPageId={null}
      />
    )

    expect(screen.getByRole('link', { name: 'Orphan' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('breaks parent cycles without losing nodes', () => {
    render(
      <WikiTree
        pages={[
          makePage({ id: 'wp_a', title: 'A', parentId: 'wp_b' }),
          makePage({ id: 'wp_b', title: 'B', parentId: 'wp_a' }),
        ]}
        hrefBase="/wiki"
        currentPageId={null}
      />
    )

    expect(screen.getByRole('link', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'B' })).toBeInTheDocument()
  })

  it('renders the updated day', () => {
    render(
      <WikiTree pages={[makePage()]} hrefBase="/wiki" currentPageId={null} />
    )

    expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument()
  })

  it('renders an empty state without pages', () => {
    render(<WikiTree pages={[]} hrefBase="/wiki" currentPageId={null} />)

    expect(screen.getByText('No wiki pages yet')).toBeInTheDocument()
  })
})
