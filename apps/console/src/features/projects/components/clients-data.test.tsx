// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeClientGrant, makeProject } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveProject: vi.fn(),
  listGrants: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/clients',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
    },
    clientGrants: {
      list: mocks.listGrants,
    },
  },
}))

import { ProjectClientsData } from './clients-data'

afterEach(cleanup)

describe('ProjectClientsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listGrants.mockResolvedValue({
      data: listOf([makeClientGrant()]),
      error: null,
    })
  })

  it('lists grants with invite dates and no revoke affordance', async () => {
    render(
      await ProjectClientsData({
        organizationId: 'org_1',
        projectId: 'proj_test',
      }),
    )

    expect(mocks.listGrants).toHaveBeenCalledWith('org_1', 'proj_test', {
      limit: 100,
      includeRevoked: true,
    })
    expect(screen.getByText('user_client')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Revoke' }),
    ).not.toBeInTheDocument()
  })

  it('marks revoked grants without offering revoke', async () => {
    mocks.listGrants.mockResolvedValue({
      data: listOf([makeClientGrant({ revokedAt: 1700000100 })]),
      error: null,
    })

    render(
      await ProjectClientsData({
        organizationId: 'org_1',
        projectId: 'proj_test',
      }),
    )

    expect(screen.getByText('Revoked')).toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
  })

  it('shows an empty state when there are no grants', async () => {
    mocks.listGrants.mockResolvedValue({
      data: listOf([]),
      error: null,
    })

    render(
      await ProjectClientsData({
        organizationId: 'org_1',
        projectId: 'proj_test',
      }),
    )

    expect(screen.getByText('No client grants yet')).toBeInTheDocument()
  })

  it('shows a banner when grants cannot be loaded', async () => {
    mocks.listGrants.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectClientsData({
        organizationId: 'org_1',
        projectId: 'proj_test',
      }),
    )

    expect(
      screen.getByText('Client grants could not be loaded'),
    ).toBeInTheDocument()
  })
})
