import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MarkdownCodeBlock } from './markdown-code-block'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

describe('MarkdownCodeBlock', () => {
  it('renders the detected language label from highlighted code', () => {
    render(
      <MarkdownCodeBlock>
        <code className="hljs language-typescript">
          <span className="hljs-keyword">const</span> ready = true
        </code>
      </MarkdownCodeBlock>
    )

    const label = screen.getByText('typescript')

    expect(label).toHaveClass('text-muted-foreground', 'text-xs')
    expect(label.parentElement?.parentElement).toHaveClass(
      '-mx-4',
      'px-4',
      'sm:mx-0',
      'sm:px-0',
      'rounded-none',
      'sm:rounded-md'
    )
  })

  it('omits the language label when the code has no detected language', () => {
    render(
      <MarkdownCodeBlock>
        <code>unclassified text</code>
      </MarkdownCodeBlock>
    )

    expect(screen.queryByText('typescript')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent(
      'Copy'
    )
  })

  it('copies the raw code text and reports a transient copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    mockClipboard(writeText)
    render(
      <MarkdownCodeBlock>
        <code className="hljs language-typescript">
          <span className="hljs-keyword">const</span> ready = true
        </code>
      </MarkdownCodeBlock>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('const ready = true')
    )
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent(
      'Copied'
    )
  })

  it('reports a copy failure when clipboard permission is denied', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('Permission denied')))
    render(
      <MarkdownCodeBlock>
        <code>const ready = true</code>
      </MarkdownCodeBlock>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Couldn't copy code. Try again."
    )
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveTextContent(
      'Copy failed'
    )
  })
})
