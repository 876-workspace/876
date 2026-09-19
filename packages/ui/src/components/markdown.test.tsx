import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Markdown } from './markdown'

describe('Markdown', () => {
  it('renders GFM headings, lists, code, and tables', () => {
    render(
      <Markdown
        content={
          '## Plan\n\n- [x] Ship it\n\n`const ok = true`\n\n| A | B |\n| - | - |\n| 1 | 2 |'
        }
      />
    )

    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('const ok = true')).toHaveProperty(
      'tagName',
      'CODE'
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('drops unsafe URL schemes and leaves raw HTML inert', () => {
    const { container } = render(
      <Markdown
        content={'[bad](javascript:alert(1))\n\n<script>alert(1)</script>'}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
  })

  it('highlights known fenced code with hljs token markup', () => {
    const { container } = render(
      <Markdown content={'```ts\nconst release = true\n```'} />
    )

    expect(container.querySelector('code.hljs.language-ts')).toBeInTheDocument()
    expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const')
  })

  it('renders an unknown fenced language as plain code without throwing', () => {
    const { container } = render(
      <Markdown content={'```madeup\nlaunch now\n```'} />
    )

    expect(container.querySelector('code.language-madeup')).toHaveTextContent(
      'launch now'
    )
    expect(container.querySelector('.hljs-keyword')).not.toBeInTheDocument()
  })

  it('renders a fenced block without a language without throwing', () => {
    render(<Markdown content={'```\nunclassified note\n```'} />)

    expect(screen.getByText('unclassified note')).toHaveProperty(
      'tagName',
      'CODE'
    )
  })

  it('wraps tables in an edge-to-edge overflow container', () => {
    const { container } = render(
      <Markdown content={'| Name | Value |\n| - | - |\n| Build | Ready |'} />
    )
    const table = screen.getByRole('table')

    expect(table.parentElement).toHaveClass(
      'my-3',
      '-mx-4',
      'overflow-x-auto',
      'px-4',
      'sm:mx-0',
      'sm:px-0'
    )
    expect(container.querySelector('table')).toBe(table)
  })

  it('applies distinct classes for h1, h2, and h3', () => {
    const { container } = render(
      <Markdown content={'# One\n\n## Two\n\n### Three'} />
    )
    const root = container.firstElementChild

    expect(root).toHaveClass('[&_h1]:text-xl', '[&_h1]:mt-6')
    expect(root).toHaveClass('[&_h2]:text-lg', '[&_h2]:mt-5')
    expect(root).toHaveClass('[&_h3]:text-base', '[&_h3]:mt-4')
  })

  it('renders task list checkboxes as disabled read-only controls', () => {
    render(<Markdown content={'- [ ] Leave the renderer read-only'} />)

    expect(screen.getByRole('checkbox', { checked: false })).toBeDisabled()
  })

  it('renders checked task items as checked and muted', () => {
    const { container } = render(<Markdown content={'- [x] Ship the reader'} />)

    expect(screen.getByRole('checkbox', { checked: true })).toBeDisabled()
    expect(container.firstElementChild).toHaveClass(
      '[&_li:has(input[type=checkbox]:checked)]:text-muted-foreground'
    )
  })

  it('keeps inline code treatment unchanged', () => {
    const { container } = render(
      <Markdown content={'Use `pnpm check` before release.'} />
    )

    expect(screen.getByText('pnpm check')).toHaveProperty('tagName', 'CODE')
    expect(container.firstElementChild).toHaveClass(
      '[&_code]:bg-muted',
      '[&_code]:rounded',
      '[&_code]:px-1',
      '[&_code]:py-0.5'
    )
  })

  it('continues to strip javascript links through safeUrl', () => {
    render(<Markdown content={'[Unsafe](javascript:alert(1))'} />)

    expect(
      screen.queryByRole('link', { name: 'Unsafe' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('Unsafe')).toBeInTheDocument()
  })

  it('continues to permit https and mailto links through safeUrl', () => {
    render(
      <Markdown
        content={
          '[Docs](https://876.example/docs) and [Support](mailto:help@876.example)'
        }
      />
    )

    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://876.example/docs'
    )
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      'mailto:help@876.example'
    )
  })
})
