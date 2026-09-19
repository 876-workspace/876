// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ listRequestsAcrossOrganizations: vi.fn() }))

vi.mock('@/lib/clients/crm', () => ({
  listRequestsAcrossOrganizations: mocks.listRequestsAcrossOrganizations,
}))
vi.mock('@876/ui/app-error', () => ({
  AppError: ({
    title,
    error,
  }: {
    title: string
    error: { message: string }
  }) => <div role="alert">{`${title}: ${error.message}`}</div>,
}))
vi.mock('./all-requests-table', () => ({
  AllRequestsTable: () => <div role="table">Request table</div>,
}))

import { AllRequestsTableData } from './all-requests-table-data'

afterEach(cleanup)

describe('AllRequestsTableData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a load error while keeping the table shell mounted', async () => {
    mocks.listRequestsAcrossOrganizations.mockResolvedValue({
      data: null,
      error: { code: 'crm/internal', message: 'CRM is unavailable.' },
    })

    render(
      await AllRequestsTableData({
        searchParams: Promise.resolve({ status: undefined, after: undefined }),
        status: 'all',
      })
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Some request data could not be loaded: CRM is unavailable.'
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(mocks.listRequestsAcrossOrganizations).toHaveBeenCalledWith(
      undefined,
      {
        status: undefined,
        limit: 25,
        startingAfter: undefined,
      }
    )
  })

  it('resolves a status filter to its concrete value instead of "all"', async () => {
    mocks.listRequestsAcrossOrganizations.mockResolvedValue({
      data: { data: [] },
      error: null,
    })

    await AllRequestsTableData({
      searchParams: Promise.resolve({ status: undefined, after: 'req_1' }),
      status: 'OPEN',
    })

    expect(mocks.listRequestsAcrossOrganizations).toHaveBeenCalledWith(
      undefined,
      {
        status: 'OPEN',
        limit: 25,
        startingAfter: 'req_1',
      }
    )
  })
})
