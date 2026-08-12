/** @vitest-environment jsdom */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Loading from './loading'

describe('Settings Loading', () => {
  it('renders the real heading and shape-matched setting cards', () => {
    const { container } = render(<Loading />)
    expect(container.textContent).toContain('Settings')
    expect(container.querySelectorAll('[class~="876-card"]')).toHaveLength(6)
    expect(container.querySelector('table')).toBeNull()
  })
})
