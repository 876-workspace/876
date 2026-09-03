// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Label } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  listLabels: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/orgs/test-org/workspace/projects/labels',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    labels: {
      list: mocks.listLabels,
    },
  },
}))

vi.mock('../../../_data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import OrganizationLabelsPage from './page'
import { LabelsData } from '@/features/projects/components/labels-data'

const mockLabels: Label[] = [
  {
    object: 'projects.label',
    id: 'lbl_1',
    tenantId: 'tenant_1',
    name: 'security',
    color: '#e11d48',
    description: 'Security vulnerabilities',
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
]

afterEach(cleanup)

describe('OrganizationLabelsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.listLabels.mockResolvedValue({
      data: { object: 'list', data: mockLabels, hasMore: false, totalCount: 1 },
      error: null,
    })
  })

  it('renders labels toolbar and column headers while pending', async () => {
    const page = await OrganizationLabelsPage({
      params: Promise.resolve({ slug: 'test-org' }),
    })

    const { container } = render(page)
    expect(screen.getByRole('heading', { name: 'Labels' })).toBeInTheDocument()

    // Real table column headers are rendered during pending fallback
    expect(screen.getByText('Label')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(container.querySelector('thead')).toBeInTheDocument()
  })

  it('loads and renders labels data', async () => {
    const element = await LabelsData({ organizationId: 'org_123' })
    render(element)

    expect(mocks.listLabels).toHaveBeenCalledWith('org_123')
    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('#e11d48')).toBeInTheDocument()
    expect(screen.getByText('Security vulnerabilities')).toBeInTheDocument()
  })

  it('renders AppError notice when labels fail to load', async () => {
    mocks.listLabels.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/unavailable',
        message: 'Label store unavailable',
      },
    })

    const element = await LabelsData({ organizationId: 'org_123' })
    render(element)

    expect(
      screen.getByText('Label data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Label store unavailable')).toBeInTheDocument()
  })
})
