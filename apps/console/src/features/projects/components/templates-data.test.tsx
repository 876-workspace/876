// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeProjectTemplate } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listTemplates: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/templates',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectTemplates: {
      list: mocks.listTemplates,
    },
  },
}))

import { TemplatesData } from './templates-data'

afterEach(cleanup)

describe('TemplatesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listTemplates.mockResolvedValue({
      data: listOf([makeProjectTemplate()]),
      error: null,
    })
  })

  it('fetches templates for the host organization', async () => {
    render(await TemplatesData({ organizationId: 'org_1', base: '/projects' }))

    expect(mocks.listTemplates).toHaveBeenCalledWith('org_1')
  })

  it('renders template names with version and counts', async () => {
    render(await TemplatesData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getAllByText('Web Launch')).toHaveLength(2)
    expect(screen.getByText('v3')).toBeInTheDocument()
    expect(
      screen.getByText('2 phases · 1 task list · 4 work items · 1 dependency')
    ).toBeInTheDocument()
  })

  it('links each row under the host templates root', async () => {
    render(
      await TemplatesData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
      })
    )

    expect(screen.getByRole('link', { name: 'Web Launch' })).toHaveAttribute(
      'href',
      '/workspace/acme/projects/templates/ptpl_test'
    )
  })

  it('shows the shared empty state when no templates exist', async () => {
    mocks.listTemplates.mockResolvedValue({ data: listOf([]), error: null })

    render(await TemplatesData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getAllByText('No templates yet')).toHaveLength(2)
  })

  it('keeps the list shell and shows a banner when loading fails', async () => {
    mocks.listTemplates.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await TemplatesData({ organizationId: 'org_1', base: '/projects' }))

    expect(
      screen.getByText('Template data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getAllByText('No templates yet')).toHaveLength(2)
  })
})
