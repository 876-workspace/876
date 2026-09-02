/** @vitest-environment jsdom */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Loading from './loading'

describe('Settings Loading', () => {
  it('renders the real page heading so navigation never shows a blank screen', () => {
    const { container } = render(<Loading />)

    expect(container.textContent).toContain('Settings')
    expect(container.querySelector('h1')?.className).toContain('876-page-title')
  })

  it('renders no section cards, because which sections appear depends on permissions', () => {
    const { container } = render(<Loading />)

    expect(container.querySelectorAll('[class~="876-card"]')).toHaveLength(0)
    expect(container.querySelector('a')).toBeNull()
  })
})
