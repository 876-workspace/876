// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeLayout, makeProjectField } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveLayout: vi.fn(),
  listFields: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/layouts/lay_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    layouts: {
      retrieve: mocks.retrieveLayout,
    },
    projectCustomFields: {
      list: mocks.listFields,
    },
  },
}))

import { LayoutDetailData } from './layout-detail-data'

function renderDetail(layoutId = 'lay_test', base = '/projects') {
  return LayoutDetailData({
    organizationId: 'org_1',
    base,
    layoutId,
  })
}

afterEach(cleanup)

describe('LayoutDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveLayout.mockResolvedValue({
      data: makeLayout(),
      error: null,
    })
    mocks.listFields.mockResolvedValue({
      data: listOf([makeProjectField()]),
      error: null,
    })
  })

  it('retrieves the decoded layout for the host organization', async () => {
    render(await renderDetail('lay%20test'))

    expect(mocks.retrieveLayout).toHaveBeenCalledWith('org_1', 'lay test')
  })

  it('resolves the field catalog for the host organization', async () => {
    render(await renderDetail())

    expect(mocks.listFields).toHaveBeenCalledWith('org_1')
  })

  it('renders the shared summary with name and entity', async () => {
    render(await renderDetail())

    expect(screen.getByText('Project default')).toBeInTheDocument()
    expect(screen.getByText('project · Default')).toBeInTheDocument()
    expect(screen.getByText('Basics')).toBeInTheDocument()
  })

  it('resolves project field labels for cf: keys', async () => {
    render(await renderDetail())

    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('notFound when the layout does not exist', async () => {
    mocks.retrieveLayout.mockResolvedValue({
      data: null,
      error: { code: 'projects/layout-not-found', message: 'missing' },
    })

    render(await renderDetail())

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('shows a banner with raw keys when the catalog fails', async () => {
    mocks.listFields.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await renderDetail())

    expect(
      screen.getByText('Some layout details could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Project default')).toBeInTheDocument()
    expect(screen.getByText('cf:team')).toBeInTheDocument()
  })

  it('links back to the host layouts root', async () => {
    render(await renderDetail('lay_test', '/workspace/acme/projects'))

    expect(
      screen.getByRole('link', { name: 'Back to layouts' })
    ).toHaveAttribute('href', '/workspace/acme/projects/layouts')
  })
})
