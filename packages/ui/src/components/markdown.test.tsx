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
})
