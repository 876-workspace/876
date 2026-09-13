import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DetailChromeGate } from './detail-chrome-gate'

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: { current: '/users/raheem' },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname.current,
}))

function renderGate(withEditChrome: boolean) {
  return render(
    <DetailChromeGate
      editHref="/users/raheem/edit"
      editChrome={withEditChrome ? <p>Edit header</p> : undefined}
    >
      <p>Record chrome</p>
    </DetailChromeGate>
  )
}

describe('DetailChromeGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.current = '/users/raheem'
  })

  it('renders the record chrome away from edit routes', () => {
    renderGate(true)

    expect(screen.getByText('Record chrome')).toBeInTheDocument()
    expect(screen.queryByText('Edit header')).not.toBeInTheDocument()
  })

  it('swaps in the compact edit header on the record edit route', () => {
    mockPathname.current = '/users/raheem/edit'

    renderGate(true)

    expect(screen.getByText('Edit header')).toBeInTheDocument()
    expect(screen.queryByText('Record chrome')).not.toBeInTheDocument()
  })

  it('hides all chrome on a nested edit route that owns its own title', () => {
    mockPathname.current = '/users/raheem/contacts/contact_1/edit'

    const { container } = renderGate(true)

    expect(container).toBeEmptyDOMElement()
  })

  it('hides all chrome on the edit route when no edit header is given', () => {
    mockPathname.current = '/users/raheem/edit'

    const { container } = renderGate(false)

    expect(container).toBeEmptyDOMElement()
  })
})
