// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ClientVisibleBadge } from './client-visible-badge'

describe('ClientVisibleBadge', () => {
  afterEach(cleanup)

  it('renders the Client visible badge when clientVisible is true', () => {
    render(<ClientVisibleBadge clientVisible={true} />)

    expect(screen.getByText('Client visible')).toBeInTheDocument()
  })

  it('renders nothing when clientVisible is false', () => {
    const { container } = render(<ClientVisibleBadge clientVisible={false} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('removes the badge when visibility is withdrawn', () => {
    const { container, rerender } = render(
      <ClientVisibleBadge clientVisible={true} />
    )

    rerender(<ClientVisibleBadge clientVisible={false} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('adds the badge when visibility is granted', () => {
    const { rerender } = render(<ClientVisibleBadge clientVisible={false} />)

    rerender(<ClientVisibleBadge clientVisible={true} />)

    expect(screen.getByText('Client visible')).toHaveAttribute('data-slot', 'badge')
  })

  it('marks the badge as info variant', () => {
    render(<ClientVisibleBadge clientVisible={true} />)

    expect(screen.getByText('Client visible')).toHaveClass('text-info')
  })

  it('renders a single badge element when visible', () => {
    render(<ClientVisibleBadge clientVisible={true} />)

    expect(document.querySelectorAll('[data-slot="badge"]')).toHaveLength(1)
  })
})
