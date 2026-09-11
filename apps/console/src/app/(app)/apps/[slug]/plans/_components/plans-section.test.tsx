// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { PlansSection } from './plans-section'

const mocks = vi.hoisted(() => ({ segments: [] as string[] }))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  usePathname: () => '/apps/876-couriers/plans',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('./plans-toolbar', () => ({
  PlansToolbar: () => <div data-testid="toolbar" />,
}))

function renderAt(segments: string[]) {
  mocks.segments = segments
  render(
    <PlansSection slug="876-couriers" list={<div data-testid="list" />}>
      <div data-testid="detail" />
    </PlansSection>
  )
}

describe('PlansSection', () => {
  beforeEach(() => {
    mocks.segments = []
  })

  it('opens the new form beside the list instead of taking over', () => {
    renderAt(['new'])

    expect(screen.getByTestId('list')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('detail')).toBeInTheDocument()
  })

  it('opens the plan edit form beside the list instead of taking over', () => {
    renderAt(['876-couriers-free', 'edit'])

    expect(screen.getByTestId('list')).toBeInTheDocument()
    expect(screen.getByTestId('detail')).toBeInTheDocument()
  })

  it('opens a price form beside the list instead of taking over', () => {
    renderAt(['876-couriers-free', 'pricing', 'new'])

    expect(screen.getByTestId('list')).toBeInTheDocument()
    expect(screen.getByTestId('detail')).toBeInTheDocument()
  })
})
