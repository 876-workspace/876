// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { FeaturesSection } from './features-section'

const mocks = vi.hoisted(() => ({ segments: [] as string[] }))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  usePathname: () => '/apps/876-couriers/features',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('./features-toolbar', () => ({
  FeaturesToolbar: () => <div data-testid="toolbar" />,
}))

function renderAt(segments: string[]) {
  mocks.segments = segments
  render(
    <FeaturesSection slug="876-couriers" list={<div data-testid="list" />}>
      <div data-testid="detail" />
    </FeaturesSection>
  )
}

describe('FeaturesSection', () => {
  beforeEach(() => {
    mocks.segments = []
  })

  it('opens the new form beside the list instead of taking over', () => {
    renderAt(['new'])

    expect(screen.getByTestId('list')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('detail')).toBeInTheDocument()
  })

  it('lets diagnostics take over the content area', () => {
    renderAt(['diagnostics'])

    expect(screen.queryByTestId('list')).toBeNull()
    expect(screen.queryByTestId('toolbar')).toBeNull()
    expect(screen.getByTestId('detail')).toBeInTheDocument()
  })
})
